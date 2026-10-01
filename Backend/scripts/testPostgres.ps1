param([switch]$Browser)
$ErrorActionPreference = 'Stop'
$testRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$pgBin = if ($env:PG_BIN) { $env:PG_BIN } else { 'C:\Program Files\PostgreSQL\18\bin' }
if (!(Test-Path -LiteralPath (Join-Path $pgBin 'initdb.exe'))) { throw 'Set PG_BIN to your PostgreSQL bin directory.' }
$testRun = Join-Path $testRoot ('.test-postgres\' + [guid]::NewGuid().ToString())
$testData = Join-Path $testRun 'data'
New-Item -ItemType Directory -Path $testRun -Force | Out-Null
$testBase = [IO.Path]::GetFullPath((Join-Path $testRoot '.test-postgres'))
$runnerLock = [IO.File]::Open((Join-Path $testBase 'runner.lock'), [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$randomBuffer = New-Object byte[] 32
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$randomGenerator.GetBytes($randomBuffer)
$randomGenerator.Dispose()
$testPassword = [Convert]::ToBase64String($randomBuffer)
$passwordFile = Join-Path $testRun 'password.txt'
Set-Content -LiteralPath $passwordFile -Value $testPassword -Encoding ascii
$testListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$testListener.Start()
$testPort = $testListener.LocalEndpoint.Port
$testListener.Stop()
$serverStarted = $false
try {
  # Recover only orphaned fixture servers under this test workspace. The lock prevents concurrent runs.
  foreach ($oldRun in (Get-ChildItem -LiteralPath $testBase -Directory)) {
    $oldData = [IO.Path]::GetFullPath((Join-Path $oldRun.FullName 'data'))
    if (!$oldData.StartsWith($testBase + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid test data path.' }
    if (Test-Path -LiteralPath (Join-Path $oldData 'postmaster.pid')) {
      & (Join-Path $pgBin 'pg_ctl.exe') -D $oldData status 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) { & (Join-Path $pgBin 'pg_ctl.exe') -D $oldData -m fast -w -t 10 stop | Out-Null }
    }
  }
  & (Join-Path $pgBin 'initdb.exe') -D $testData -U fd_test -A scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Could not initialize isolated test PostgreSQL.' }
  $ctlArguments = @('-D', ('"' + $testData + '"'), '-l', ('"' + (Join-Path $testRun 'postgres.log') + '"'), '-o', ('"-h 127.0.0.1 -p ' + $testPort + '"'), '-w', '-t', '20', 'start')
  $ctlProcess = Start-Process -FilePath (Join-Path $pgBin 'pg_ctl.exe') -ArgumentList $ctlArguments -WindowStyle Hidden -RedirectStandardOutput (Join-Path $testRun 'control-output.log') -RedirectStandardError (Join-Path $testRun 'control-error.log') -PassThru
  $serverStarted = $true
  $ctlHandle = $ctlProcess.Handle
  if (!$ctlProcess.WaitForExit(30000)) { throw 'Timed out starting isolated test PostgreSQL.' }
  $ctlProcess.Refresh()
  if ($null -ne $ctlProcess.ExitCode -and $ctlProcess.ExitCode -ne 0) { throw 'Could not start isolated test PostgreSQL.' }
  $env:PGPASSWORD = $testPassword
  & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p $testPort -U fd_test fit_district_auth_test
  if ($LASTEXITCODE -ne 0) { throw 'Could not create dedicated test database.' }
  $env:TEST_DATABASE_URL = "postgresql://fd_test:$([Uri]::EscapeDataString($testPassword))@127.0.0.1:$testPort/fit_district_auth_test"
  if ($Browser) {
    $env:NODE_ENV='test'
    $env:DATABASE_URL=$env:TEST_DATABASE_URL
    $env:DATABASE_SSL='false'
    $env:MAIL_TRANSPORT='file'
    $env:FRONTEND_ORIGIN='http://127.0.0.1:5173'
    $env:PORT='3001'
    foreach ($keyName in @('JWT_SECRET','CODE_SECRET','CSRF_SECRET','FIELD_ENCRYPTION_KEY')) {
      $keyBuffer = New-Object byte[] 32
      $keyGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
      $keyGenerator.GetBytes($keyBuffer)
      $keyGenerator.Dispose()
      Set-Item -LiteralPath ('Env:' + $keyName) -Value ([BitConverter]::ToString($keyBuffer).Replace('-','').ToLowerInvariant())
    }
    & node (Join-Path $testRoot 'scripts\migrate.js')
    if ($LASTEXITCODE -ne 0) { throw 'Test fixture migration failed.' }
    & node (Join-Path $testRoot 'src\server.js')
  } else {
    & node --test (Join-Path $testRoot 'tests\auth.integration.js')
  }
  $testExitCode = $LASTEXITCODE
} finally {
  if ($serverStarted) { & (Join-Path $pgBin 'pg_ctl.exe') -D $testData -m fast -w stop | Out-Null }
  Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
  $runnerLock.Dispose()
}
exit $testExitCode
