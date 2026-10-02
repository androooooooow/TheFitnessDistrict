-- Run after 001-auth.sql and 002-gym.sql in the same database.
BEGIN;
SELECT pg_advisory_xact_lock(942717);
DO $migration$
BEGIN
IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE name='003-progress') THEN

ALTER TABLE member_profiles ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
CREATE TABLE progress_entries (
 id uuid PRIMARY KEY, member_id uuid NOT NULL REFERENCES users(id),
 metric text NOT NULL CHECK(metric IN ('Weight','Bench press','Waist')),
 measured_on date NOT NULL CHECK(measured_on>='1900-01-01'), encrypted_data text NOT NULL,
 source text NOT NULL CHECK(source IN ('profile','journal')), created_by uuid NOT NULL REFERENCES users(id),
 author_role text NOT NULL CHECK(author_role IN ('admin','user')), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 sort_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX progress_member_date ON progress_entries(member_id,measured_on DESC,sort_order DESC);
CREATE INDEX progress_metric_date ON progress_entries(member_id,metric,measured_on DESC,sort_order DESC);
CREATE TABLE member_goals (
 id uuid PRIMARY KEY, member_id uuid NOT NULL REFERENCES users(id),
 metric text NOT NULL CHECK(metric IN ('Weight','Bench press','Waist')), encrypted_data text NOT NULL,
 updated_by uuid NOT NULL REFERENCES users(id), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(member_id,metric)
);

INSERT INTO schema_migrations(name) VALUES('003-progress');
END IF;
END;
$migration$;
COMMIT;
