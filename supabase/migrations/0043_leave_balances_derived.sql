-- 0043_leave_balances_derived.sql
-- Applied manually in the Supabase SQL editor on 2026-10-06 (after a backup to
-- leave_balances_backup_20261006). Kept here so the repo matches the database.
--
-- leave_balances.*_used are now always recomputed from approved leave_requests
-- instead of being nudged up and down by the approve / cancel / edit RPCs.
--
-- The running-total approach drifted whenever a step was missed:
--   * Latifah: leave approved before its employment-year row existed was never
--     added, but cancelling it later subtracted it, wiping out another day.
--   * Leong / Sabina: leave_requests.days were corrected after the public
--     holiday fix, but the stored totals kept the old figures.
-- With a trigger on leave_requests, every write path (RPCs, direct updates,
-- manual SQL fixes) leaves the totals equal to what the requests say.
--
-- Charging rules (unchanged from 0035):
--   * annual   -> employment year containing start_date, shifted by
--                 annual_charge_offset (-1 / 0 / +1), floor year 1
--   * sick / hospitalization -> year containing start_date
--   * leave dated before employment_start_date is ignored (returning workers)
--   * other leave types (no_pay, off_day, ...) are not counted

-- ═══════════════════════════════════════════════════════════════════
-- PART 1: the single source of the used figures
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION leave_used_for_year(p_employee_id uuid, p_employment_year int)
RETURNS TABLE (annual_used numeric, sick_used numeric, hospitalization_used numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH charged AS (
    SELECT lr.leave_type::text AS lt,
           lr.days,
           CASE WHEN lr.leave_type::text = 'annual'
             THEN GREATEST(1, EXTRACT(YEAR FROM AGE(lr.start_date, e.employment_start_date))::int + 1
                              + COALESCE(lr.annual_charge_offset, 0))
             ELSE EXTRACT(YEAR FROM AGE(lr.start_date, e.employment_start_date))::int + 1
           END AS yr
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
     WHERE lr.employee_id = p_employee_id
       AND lr.status = 'approved'
       AND lr.start_date >= e.employment_start_date
  )
  SELECT COALESCE(SUM(days) FILTER (WHERE lt = 'annual'), 0),
         COALESCE(SUM(days) FILTER (WHERE lt = 'sick'), 0),
         COALESCE(SUM(days) FILTER (WHERE lt = 'hospitalization'), 0)
    FROM charged
   WHERE yr = p_employment_year;
$$;

-- Creates any missing year rows that approved leave is charged to, then
-- rewrites every row's used figures for the employee.
CREATE OR REPLACE FUNCTION recalc_leave_balances(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_start date;
BEGIN
  SELECT employment_start_date INTO emp_start FROM employees WHERE id = p_employee_id;
  IF emp_start IS NULL THEN RETURN; END IF;

  INSERT INTO leave_balances (employee_id, year_start, year_end, employment_year)
  SELECT DISTINCT p_employee_id,
         CAST(emp_start + make_interval(years := yr - 1) AS date),
         CAST(emp_start + make_interval(years := yr) - INTERVAL '1 day' AS date),
         yr
    FROM (
      SELECT CASE WHEN lr.leave_type::text = 'annual'
               THEN GREATEST(1, EXTRACT(YEAR FROM AGE(lr.start_date, emp_start))::int + 1
                                + COALESCE(lr.annual_charge_offset, 0))
               ELSE EXTRACT(YEAR FROM AGE(lr.start_date, emp_start))::int + 1
             END AS yr
        FROM leave_requests lr
       WHERE lr.employee_id = p_employee_id
         AND lr.status = 'approved'
         AND lr.leave_type::text IN ('annual', 'sick', 'hospitalization')
         AND lr.start_date >= emp_start
    ) charged
  ON CONFLICT (employee_id, year_start) DO NOTHING;

  UPDATE leave_balances lb
     SET annual_used          = u.annual_used,
         sick_used            = u.sick_used,
         hospitalization_used = u.hospitalization_used
    FROM leave_balances lb2
    CROSS JOIN LATERAL leave_used_for_year(lb2.employee_id, lb2.employment_year) u
   WHERE lb.id = lb2.id
     AND lb.employee_id = p_employee_id
     AND (lb.annual_used, lb.sick_used, lb.hospitalization_used)
         IS DISTINCT FROM (u.annual_used, u.sick_used, u.hospitalization_used);
END;
$$;

-- Internal only: the triggers call these; nobody needs them over the API.
REVOKE ALL ON FUNCTION leave_used_for_year(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION recalc_leave_balances(uuid) FROM PUBLIC, anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- PART 2: triggers
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_leave_requests_recalc_balances()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.employee_id, NEW.status, NEW.leave_type, NEW.start_date, NEW.days, NEW.annual_charge_offset)
         IS NOT DISTINCT FROM
         (OLD.employee_id, OLD.status, OLD.leave_type, OLD.start_date, OLD.days, OLD.annual_charge_offset)
  THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recalc_leave_balances(OLD.employee_id);
  END IF;
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.employee_id IS DISTINCT FROM OLD.employee_id) THEN
    PERFORM recalc_leave_balances(NEW.employee_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS leave_requests_recalc_balances ON leave_requests;
CREATE TRIGGER leave_requests_recalc_balances
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION trg_leave_requests_recalc_balances();

-- Rows created elsewhere (ensureLeaveBalances in the app) start with the
-- correct figures rather than whatever the caller computed.
CREATE OR REPLACE FUNCTION trg_leave_balances_fill_used()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT u.annual_used, u.sick_used, u.hospitalization_used
    INTO NEW.annual_used, NEW.sick_used, NEW.hospitalization_used
    FROM leave_used_for_year(NEW.employee_id, NEW.employment_year) u;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leave_balances_fill_used ON leave_balances;
CREATE TRIGGER leave_balances_fill_used
  BEFORE INSERT ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION trg_leave_balances_fill_used();


-- ═══════════════════════════════════════════════════════════════════
-- PART 3: RPCs no longer touch leave_balances (the trigger does)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION approve_leave_request(
  request_id uuid,
  p_annual_charge_offset int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req leave_requests%rowtype;
BEGIN
  IF NOT is_manager() THEN
    RAISE EXCEPTION 'Only managers can approve leave requests';
  END IF;

  SELECT * INTO req FROM leave_requests WHERE id = request_id AND status = 'pending';
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Leave request not found or not pending';
  END IF;

  UPDATE leave_requests
    SET status = 'approved',
        approved_by = auth.uid(),
        approved_at = now(),
        annual_charge_offset = CASE WHEN req.leave_type::text = 'annual'
                                    THEN p_annual_charge_offset ELSE 0 END
    WHERE id = request_id;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_leave_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req leave_requests%rowtype;
BEGIN
  SELECT * INTO req FROM leave_requests WHERE id = request_id;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF NOT is_manager() AND req.employee_id != current_employee_id() THEN
    RAISE EXCEPTION 'Not authorized to cancel this leave request';
  END IF;

  IF req.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Only pending or approved leave can be cancelled';
  END IF;

  UPDATE leave_requests SET status = 'cancelled' WHERE id = request_id;
END;
$$;

-- p_days was `integer`, which rounded half-day edits. Now numeric.
DROP FUNCTION IF EXISTS edit_approved_leave_request(uuid, text, date, date, integer, text, integer);

CREATE OR REPLACE FUNCTION edit_approved_leave_request(
  p_request_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_days numeric,
  p_reason text,
  p_annual_charge_offset integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req leave_requests%rowtype;
BEGIN
  IF NOT is_manager() THEN
    RAISE EXCEPTION 'Only managers can edit approved leave';
  END IF;

  SELECT * INTO req FROM leave_requests WHERE id = p_request_id;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;
  IF req.status != 'approved' THEN RAISE EXCEPTION 'Leave request is not approved'; END IF;

  UPDATE leave_requests
    SET leave_type = p_leave_type::leave_type,
        start_date = p_start_date,
        end_date   = p_end_date,
        days       = p_days,
        reason     = p_reason,
        annual_charge_offset = CASE WHEN p_leave_type = 'annual'
                                    THEN p_annual_charge_offset ELSE 0 END
    WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_leave_request(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_leave_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION edit_approved_leave_request(uuid, text, date, date, numeric, text, integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- PART 4: bring every existing row in line
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  emp record;
BEGIN
  FOR emp IN SELECT id FROM employees LOOP
    PERFORM recalc_leave_balances(emp.id);
  END LOOP;
END;
$$;
