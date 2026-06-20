-- 0027_employment_year_leave.sql
-- Employment-anniversary leave year overhaul + bonus field on payslips
--
-- IMPORTANT: The Supabase SQL editor has a character limit.
-- Run this file in FOUR separate queries in the SQL editor:
--   PART 1: Table changes (paste lines after "PART 1" up to "END PART 1")
--   PART 2: approve_leave_request RPC
--   PART 3: cancel_leave_request RPC
--   PART 4: edit_approved_leave_request RPC


-- ═══════════════════════════════════════════════════════════════════
-- PART 1: Table changes + data migration
-- ═══════════════════════════════════════════════════════════════════

-- 1a. Add bonus column to payslips
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS bonus numeric(10,2) NOT NULL DEFAULT 0;

-- 1b. Restructure leave_balances to employment-anniversary model
--     Backup old table, create new one, migrate data from leave_requests

ALTER TABLE leave_balances RENAME TO leave_balances_old;

CREATE TABLE leave_balances (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id             uuid          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year_start              date          NOT NULL,
  year_end                date          NOT NULL,
  employment_year         int           NOT NULL,
  annual_used             numeric(5,1)  NOT NULL DEFAULT 0,
  sick_used               numeric(5,1)  NOT NULL DEFAULT 0,
  hospitalization_used    numeric(5,1)  NOT NULL DEFAULT 0,
  created_at              timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year_start)
);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_balances_manager_all" ON leave_balances
  FOR ALL USING (is_manager()) WITH CHECK (is_manager());

CREATE POLICY "leave_balances_self_select" ON leave_balances
  FOR SELECT USING (employee_id = current_employee_id());

-- 1c. Migrate leave usage from leave_requests into employment-year rows.
--     One row per employment year (starting from year 1), aggregated from
--     approved leave_requests whose start_date falls within that year's window.

INSERT INTO leave_balances
  (employee_id, year_start, year_end, employment_year,
   annual_used, sick_used, hospitalization_used)
SELECT
  e.id,
  (e.employment_start_date + make_interval(years := yr - 1))::date  AS year_start,
  (e.employment_start_date + make_interval(years := yr) - INTERVAL '1 day')::date  AS year_end,
  yr AS employment_year,
  COALESCE((
    SELECT SUM(lr.days) FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.status     = 'approved'
      AND lr.leave_type = 'annual'
      AND lr.start_date >= (e.employment_start_date + make_interval(years := yr - 1))::date
      AND lr.start_date <  (e.employment_start_date + make_interval(years := yr))::date
  ), 0) AS annual_used,
  COALESCE((
    SELECT SUM(lr.days) FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.status     = 'approved'
      AND lr.leave_type = 'sick'
      AND lr.start_date >= (e.employment_start_date + make_interval(years := yr - 1))::date
      AND lr.start_date <  (e.employment_start_date + make_interval(years := yr))::date
  ), 0) AS sick_used,
  COALESCE((
    SELECT SUM(lr.days) FROM leave_requests lr
    WHERE lr.employee_id = e.id
      AND lr.status     = 'approved'
      AND lr.leave_type = 'hospitalization'
      AND lr.start_date >= (e.employment_start_date + make_interval(years := yr - 1))::date
      AND lr.start_date <  (e.employment_start_date + make_interval(years := yr))::date
  ), 0) AS hospitalization_used
FROM employees e
CROSS JOIN generate_series(
  1,
  GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.employment_start_date))::int + 1)
) AS yr
WHERE (e.employment_start_date + make_interval(years := yr - 1))::date <= CURRENT_DATE
ORDER BY e.id, yr;

DROP TABLE leave_balances_old;

-- END PART 1


-- ═══════════════════════════════════════════════════════════════════
-- PART 2: approve_leave_request RPC
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS approve_leave_request(uuid);

CREATE OR REPLACE FUNCTION approve_leave_request(request_id uuid)
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
    SET status = 'approved', approved_by = auth.uid(), approved_at = now()
    WHERE id = request_id;

  IF req.leave_type::text = 'annual' THEN
    UPDATE leave_balances
      SET annual_used = annual_used + req.days
      WHERE employee_id = req.employee_id
        AND year_start <= req.start_date
        AND year_end   >= req.start_date;

  ELSIF req.leave_type::text = 'sick' THEN
    UPDATE leave_balances
      SET sick_used = sick_used + req.days
      WHERE employee_id = req.employee_id
        AND year_start <= req.start_date
        AND year_end   >= req.start_date;

  ELSIF req.leave_type::text = 'hospitalization' THEN
    UPDATE leave_balances
      SET hospitalization_used = hospitalization_used + req.days
      WHERE employee_id = req.employee_id
        AND year_start <= req.start_date
        AND year_end   >= req.start_date;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_leave_request(uuid) TO authenticated;

-- END PART 2


-- ═══════════════════════════════════════════════════════════════════
-- PART 3: cancel_leave_request RPC
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS cancel_leave_request(uuid);

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

  -- If it was approved, reverse the balance deduction
  IF req.status = 'approved' AND req.leave_type::text != 'no_pay' THEN
    IF req.leave_type::text = 'annual' THEN
      UPDATE leave_balances
        SET annual_used = GREATEST(0, annual_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date
          AND year_end   >= req.start_date;

    ELSIF req.leave_type::text = 'sick' THEN
      UPDATE leave_balances
        SET sick_used = GREATEST(0, sick_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date
          AND year_end   >= req.start_date;

    ELSIF req.leave_type::text = 'hospitalization' THEN
      UPDATE leave_balances
        SET hospitalization_used = GREATEST(0, hospitalization_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date
          AND year_end   >= req.start_date;
    END IF;
  END IF;

  UPDATE leave_requests SET status = 'rejected' WHERE id = request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_leave_request(uuid) TO authenticated;

-- END PART 3


-- ═══════════════════════════════════════════════════════════════════
-- PART 4: edit_approved_leave_request RPC
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS edit_approved_leave_request(uuid, text, date, date, int, text);

CREATE OR REPLACE FUNCTION edit_approved_leave_request(
  p_request_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date   date,
  p_days       int,
  p_reason     text
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

  -- Reverse old balance deduction
  IF req.leave_type::text != 'no_pay' THEN
    IF req.leave_type::text = 'annual' THEN
      UPDATE leave_balances
        SET annual_used = GREATEST(0, annual_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date
          AND year_end   >= req.start_date;

    ELSIF req.leave_type::text = 'sick' THEN
      UPDATE leave_balances
        SET sick_used = GREATEST(0, sick_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date
          AND year_end   >= req.start_date;

    ELSIF req.leave_type::text = 'hospitalization' THEN
      UPDATE leave_balances
        SET hospitalization_used = GREATEST(0, hospitalization_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date
          AND year_end   >= req.start_date;
    END IF;
  END IF;

  -- Apply new balance deduction
  IF p_leave_type != 'no_pay' THEN
    IF p_leave_type = 'annual' THEN
      UPDATE leave_balances
        SET annual_used = annual_used + p_days
        WHERE employee_id = req.employee_id
          AND year_start <= p_start_date
          AND year_end   >= p_start_date;

    ELSIF p_leave_type = 'sick' THEN
      UPDATE leave_balances
        SET sick_used = sick_used + p_days
        WHERE employee_id = req.employee_id
          AND year_start <= p_start_date
          AND year_end   >= p_start_date;

    ELSIF p_leave_type = 'hospitalization' THEN
      UPDATE leave_balances
        SET hospitalization_used = hospitalization_used + p_days
        WHERE employee_id = req.employee_id
          AND year_start <= p_start_date
          AND year_end   >= p_start_date;
    END IF;
  END IF;

  UPDATE leave_requests
    SET leave_type = p_leave_type::leave_type,
        start_date = p_start_date,
        end_date   = p_end_date,
        days       = p_days,
        reason     = p_reason
    WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION edit_approved_leave_request(uuid, text, date, date, int, text) TO authenticated;

-- END PART 4
