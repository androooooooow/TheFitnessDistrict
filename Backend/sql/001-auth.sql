-- Open in pgAdmin's Query Tool connected to the fit_district database.
-- Execute this whole file. It creates the account tables and records migration 001-auth.
-- Existing application tables are never dropped or replaced.
BEGIN;

SELECT pg_advisory_xact_lock(942717);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE name = '001-auth') THEN
    CREATE TABLE users (
      id uuid PRIMARY KEY,
      email varchar(254) NOT NULL UNIQUE CHECK (email = lower(email)),
      password_hash text NOT NULL,
      role varchar(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      enabled boolean NOT NULL DEFAULT true,
      email_verified_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE member_profiles (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code varchar(50) NOT NULL UNIQUE,
      encrypted_data text NOT NULL,
      requested_membership varchar(20) NOT NULL CHECK (requested_membership IN ('monthly', 'quarterly', 'half-year', 'annual', 'day')),
      rate_category varchar(20) NOT NULL CHECK (rate_category IN ('student', 'nonStudent'))
    );

    CREATE TABLE signup_challenges (
      id uuid PRIMARY KEY,
      email varchar(254) NOT NULL UNIQUE,
      flow_hash varchar(64) NOT NULL,
      csrf_hash varchar(64) NOT NULL,
      password_hash text NOT NULL,
      encrypted_data text NOT NULL,
      code_hash varchar(64) NOT NULL,
      attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
      expires_at timestamptz NOT NULL,
      sent_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE auth_sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_hash varchar(64) NOT NULL,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE refresh_tokens (
      hash varchar(64) PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
      consumed_at timestamptz
    );

    CREATE TABLE auth_counters (
      key varchar(64) PRIMARY KEY,
      count integer NOT NULL CHECK (count >= 0),
      reset_at timestamptz NOT NULL
    );

    CREATE INDEX signup_expiry ON signup_challenges(expires_at);
    CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
    CREATE INDEX session_expiry ON auth_sessions(expires_at);
    CREATE INDEX refresh_session ON refresh_tokens(session_id);
    CREATE INDEX counter_expiry ON auth_counters(reset_at);

    INSERT INTO schema_migrations(name) VALUES ('001-auth');
  END IF;
END;
$migration$;

COMMIT;
