-- Run after 001-auth.sql in the same database.
BEGIN;
SELECT pg_advisory_xact_lock(942717);
DO $migration$
BEGIN
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE name='002-gym') THEN

CREATE TABLE member_accesses (
 id uuid PRIMARY KEY, member_id uuid NOT NULL REFERENCES users(id),
 plan_id text NOT NULL CHECK(plan_id IN ('monthly','quarterly','half-year','annual','day')),
 rate_category text NOT NULL CHECK(rate_category IN ('student','nonStudent')),
 listed_rate integer NOT NULL CHECK(listed_rate>0), time_slot text CHECK(time_slot IN ('morning','afternoon')),
 start_date date NOT NULL, end_date date NOT NULL CHECK(end_date>start_date),
 sessions integer CHECK(sessions>=0), total_sessions integer,
 status text NOT NULL CHECK(status IN ('active','suspended','replaced')),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((plan_id='day' AND time_slot IS NOT NULL AND total_sessions=1 AND sessions IS NOT NULL AND sessions<=1)
 OR (plan_id<>'day' AND time_slot IS NULL AND total_sessions IS NULL AND sessions IS NULL))
);
CREATE UNIQUE INDEX member_current_access ON member_accesses(member_id) WHERE status IN ('active','suspended');
CREATE INDEX member_access_history ON member_accesses(member_id,created_at DESC);
CREATE TABLE attendance_visits (
 id uuid PRIMARY KEY, member_id uuid NOT NULL REFERENCES users(id), access_id uuid NOT NULL REFERENCES member_accesses(id),
 time_in timestamptz NOT NULL, time_out timestamptz CHECK(time_out>=time_in), source text NOT NULL DEFAULT 'qr' CHECK(source='qr')
);
CREATE UNIQUE INDEX attendance_one_open ON attendance_visits(member_id) WHERE time_out IS NULL;
CREATE INDEX attendance_recent ON attendance_visits(time_in DESC);
CREATE INDEX attendance_member_recent ON attendance_visits(member_id,time_in DESC);
CREATE TABLE gym_requests (
 actor_id uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL, fingerprint varchar(64) NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,request_id)
);
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY, actor_id uuid, actor_role text NOT NULL CHECK(actor_role IN ('admin','user','system')),
 action text NOT NULL, entity_type text NOT NULL, entity_id uuid, details jsonb NOT NULL DEFAULT '{}',
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_recent ON audit_logs(occurred_at DESC);
CREATE INDEX audit_action_recent ON audit_logs(action,occurred_at DESC);
CREATE FUNCTION protect_gym_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit entries are append-only'; END; $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
 FOR EACH STATEMENT EXECUTE FUNCTION protect_gym_audit();

INSERT INTO schema_migrations(name) VALUES('002-gym');
END IF;
END;
$migration$;
COMMIT;
