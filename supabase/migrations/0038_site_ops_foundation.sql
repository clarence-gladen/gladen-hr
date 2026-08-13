-- 0038_site_ops_foundation.sql
-- Shared foundation for two phased, per-employee-gated site features:
--   (1) location check-in / check-out, (2) cleaning checklist + monthly report.
--
-- This migration only adds structure + config. NOTHING is shown to any employee
-- until a manager turns on their per-employee feature flags (default OFF).

-- Site geolocation. A "site" is a contracts row. All nullable until a manager
-- drops the pin (best done by standing at the site and capturing current GPS).
-- geofence_radius_m = how close an employee must be to check in (default 75m).
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS geofence_radius_m integer NOT NULL DEFAULT 75;

-- Per-employee feature gating for a phased rollout. Both default OFF, so the
-- trial is opt-in: a manager enables these for the 3 pilot cleaners only.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS feature_checkin boolean NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS feature_checklist boolean NOT NULL DEFAULT false;
