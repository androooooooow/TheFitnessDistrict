export function startupErrorMessage(stage, error) {
  const code = error.original?.code || error.parent?.code || error.code;
  if (stage === 'configuration') {
    const known = new Set([
      'Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and MAIL_FROM.',
      'Production requires HTTPS, database TLS, and SMTP email.',
      'Use separate security keys.',
    ]);
    if (known.has(error.message)) return error.message;
    return 'API startup failed: invalid configuration. Check the required settings in Backend/.env.';
  }
  if (stage === 'database') {
    if (['28P01', '28000'].includes(code))
      return 'API startup failed: PostgreSQL rejected the database username or password. Correct DATABASE_URL in Backend/.env using your PostgreSQL server credentials, then restart.';
    if (code === '3D000')
      return 'API startup failed: the database named in DATABASE_URL does not exist. Create it in PostgreSQL, then run npm run migrate.';
    if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(code))
      return 'API startup failed: PostgreSQL is unreachable. Check that its service is running and DATABASE_URL has the correct host and port.';
    return 'API startup failed: PostgreSQL connection failed. Check DATABASE_URL, database access, and configured TLS settings.';
  }
  if (stage === 'tables') {
    if (['42P01', '42703'].includes(code))
      return 'API startup failed: account or gym tables are missing from the connected database. Run npm run migrate, or execute sql/001-auth.sql, sql/002-gym.sql, and sql/003-progress.sql in order.';
    if (code === '42501')
      return 'API startup failed: the database login cannot read the account tables. Check its table permissions.';
    return 'API startup failed: the account table check failed. Check migrations and database permissions.';
  }
  if (stage === 'email') {
    const certificateCodes = new Set([
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'SELF_SIGNED_CERT_IN_CHAIN',
      'UNABLE_TO_GET_ISSUER_CERT',
      'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'CERT_HAS_EXPIRED',
      'ERR_TLS_CERT_ALTNAME_INVALID',
    ]);
    if (
      certificateCodes.has(code) ||
      certificateCodes.has(error.cause?.code) ||
      (code === 'ESOCKET' &&
        /self[- ]signed certificate|unable to (?:verify|(?:get )?(?:local )?issuer certificate)|certificate has expired|hostname.*certificate/i.test(
          error.message || '',
        ))
    )
      return 'API startup failed: the SMTP certificate could not be validated. Start with npm run dev or npm start to use the system certificate store; check the certificate issuer, hostname, and expiry.';
    if (code === 'EAUTH')
      return 'API startup failed: SMTP authentication was rejected. Check SMTP_USER and SMTP_PASSWORD; Gmail requires an app password for this SMTP setup.';
    if (['ETIMEDOUT', 'EDNS', 'ENOTFOUND', 'ECONNREFUSED'].includes(code))
      return 'API startup failed: the SMTP server could not be reached. Check SMTP_HOST, SMTP_PORT, and network connectivity.';
    return 'API startup failed: SMTP connection failed. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE, and TLS certificate trust.';
  }
  return 'API startup failed while initializing the application. Check the backend setup guide.';
}
