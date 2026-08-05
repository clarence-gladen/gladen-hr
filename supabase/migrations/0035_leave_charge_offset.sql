-- 0035_leave_charge_offset.sql
-- Annual leave: allow a leave to be CHARGED to an adjacent employment year
-- (previous / current / upcoming) without changing any year's entitlement.
-- Only the annual_used bucket moves between years.
--
-- offset semantics on leave_requests.annual_charge_offset:
--   -1 = charge the PREVIOUS employment year
--    0 = charge the year containing the leave's start_date (default, = old behaviour)
--   +1 = charge the UPCOMING employment year
-- Only meaningful for annual leave; always 0 for other types.

-- ═══════════════════════════════════════════════════════════════════
-- PART 1: column
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS annual_charge_offset smallint NOT NULL DEFAULT 0;


-- ═══════════════════════════════════════════════════════════════════
-- PART 2: approve_leave_request RPC (now takes an optional charge offset)
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS approve_leave_request(uuid);
DROP FUNCTION IF EXISTS approve_leave_request(uuid, int);

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
  req          leave_requests%rowtype;
  emp_start    date;
  yr_age       int;
  natural_year int;
  target_year  int;
  ty_start     date;
  ty_end       date;
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

  IF req.leave_type::text = 'annual' THEN
    SELECT employment_start_date INTO emp_start
      FROM employees WHERE id = req.employee_id;

    yr_age       := CAST(EXTRACT(YEAR FROM AGE(req.start_date, emp_start)) AS int);
    natural_year := yr_age + 1;
    target_year  := GREATEST(1, natural_year + p_annual_charge_offset);

    ty_start := CAST(emp_start + make_interval(years := target_year - 1) AS date);
    ty_end   := CAST(emp_start + make_interval(years := target_year) - INTERVAL '1 day' AS date);

    INSERT INTO leave_balances (employee_id, year_start, year_end, employment_year)
      VALUES (req.employee_id, ty_start, ty_end, target_year)
      ON CONFLICT (employee_id, year_start) DO NOTHING;

    UPDATE leave_balances
      SET annual_used = annual_used + req.days
      WHERE employee_id = req.employee_id AND year_start = ty_start;

  ELSIF req.leave_type::text = 'sick' THEN
    UPDATE leave_balances
      SET sick_used = sick_used + req.days
      WHERE employee_id = req.employee_id
        AND year_start <= req.start_date AND year_end >= req.start_date;

  ELSIF req.leave_type::text = 'hospitalization' THEN
    UPDATE leave_balances
      SET hospitalization_used = hospitalization_used + req.days
      WHERE employee_id = req.employee_id
        AND year_start <= req.start_date AND year_end >= req.start_date;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_leave_request(uuid, int) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- PART 3: cancel_leave_request RPC (reverses from the charged year)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cancel_leave_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req          leave_requests%rowtype;
  emp_start    date;
  yr_age       int;
  natural_year int;
  target_year  int;
  ty_start     date;
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

  IF req.status = 'approved' AND req.leave_type::text != 'no_pay' THEN
    IF req.leave_type::text = 'annual' THEN
      SELECT employment_start_date INTO emp_start
        FROM employees WHERE id = req.employee_id;

      yr_age       := CAST(EXTRACT(YEAR FROM AGE(req.start_date, emp_start)) AS int);
      natural_year := yr_age + 1;
      target_year  := GREATEST(1, natural_year + COALESCE(req.annual_charge_offset, 0));
      ty_start     := CAST(emp_start + make_interval(years := target_year - 1) AS date);

      UPDATE leave_balances
        SET annual_used = GREATEST(0, annual_used - req.days)
        WHERE employee_id = req.employee_id AND year_start = ty_start;

    ELSIF req.leave_type::text = 'sick' THEN
      UPDATE leave_balances
        SET sick_used = GREATEST(0, sick_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date AND year_end >= req.start_date;

    ELSIF req.leave_type::text = 'hospitalization' THEN
      UPDATE leave_balances
        SET hospitalization_used = GREATEST(0, hospitalization_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date AND year_end >= req.start_date;
    END IF;
  END IF;

  UPDATE leave_requests SET status = 'cancelled' WHERE id = request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cancel_leave_request(uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- PART 4: edit_approved_leave_request RPC (now takes an optional charge offset)
-- ═══════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS edit_approved_leave_request(uuid, text, date, date, int, text);
DROP FUNCTION IF EXISTS edit_approved_leave_request(uuid, text, date, date, int, text, int);

CREATE OR REPLACE FUNCTION edit_approved_leave_request(
  p_request_id uuid,
  p_leave_type text,
  p_start_date date,
  p_end_date   date,
  p_days       int,
  p_reason     text,
  p_annual_charge_offset int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req       leave_requests%rowtype;
  emp_start date;
  yr_age    int;
  ty        int;
  tys       date;
  tye       date;
BEGIN
  IF NOT is_manager() THEN
    RAISE EXCEPTION 'Only managers can edit approved leave';
  END IF;

  SELECT * INTO req FROM leave_requests WHERE id = p_request_id;
  IF req.id IS NULL THEN RAISE EXCEPTION 'Leave request not found'; END IF;
  IF req.status != 'approved' THEN RAISE EXCEPTION 'Leave request is not approved'; END IF;

  SELECT employment_start_date INTO emp_start
    FROM employees WHERE id = req.employee_id;

  -- Reverse OLD deduction from the year it was charged to
  IF req.leave_type::text != 'no_pay' THEN
    IF req.leave_type::text = 'annual' THEN
      yr_age := CAST(EXTRACT(YEAR FROM AGE(req.start_date, emp_start)) AS int);
      ty     := GREATEST(1, yr_age + 1 + COALESCE(req.annual_charge_offset, 0));
      tys    := CAST(emp_start + make_interval(years := ty - 1) AS date);
      UPDATE leave_balances
        SET annual_used = GREATEST(0, annual_used - req.days)
        WHERE employee_id = req.employee_id AND year_start = tys;

    ELSIF req.leave_type::text = 'sick' THEN
      UPDATE leave_balances
        SET sick_used = GREATEST(0, sick_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date AND year_end >= req.start_date;

    ELSIF req.leave_type::text = 'hospitalization' THEN
      UPDATE leave_balances
        SET hospitalization_used = GREATEST(0, hospitalization_used - req.days)
        WHERE employee_id = req.employee_id
          AND year_start <= req.start_date AND year_end >= req.start_date;
    END IF;
  END IF;

  -- Apply NEW deduction to the chosen year
  IF p_leave_type != 'no_pay' THEN
    IF p_leave_type = 'annual' THEN
      yr_age := CAST(EXTRACT(YEAR FROM AGE(p_start_date, emp_start)) AS int);
      ty     := GREATEST(1, yr_age + 1 + p_annual_charge_offset);
      tys    := CAST(emp_start + make_interval(years := ty - 1) AS date);
      tye    := CAST(emp_start + make_interval(years := ty) - INTERVAL '1 day' AS date);
      INSERT INTO leave_balances (employee_id, year_start, year_end, employment_year)
        VALUES (req.employee_id, tys, tye, ty)
        ON CONFLICT (employee_id, year_start) DO NOTHING;
      UPDATE leave_balances
        SET annual_used = annual_used + p_days
        WHERE employee_id = req.employee_id AND year_start = tys;

    ELSIF p_leave_type = 'sick' THEN
      UPDATE leave_balances
        SET sick_used = sick_used + p_days
        WHERE employee_id = req.employee_id
          AND year_start <= p_start_date AND year_end >= p_start_date;

    ELSIF p_leave_type = 'hospitalization' THEN
      UPDATE leave_balances
        SET hospitalization_used = hospitalization_used + p_days
        WHERE employee_id = req.employee_id
          AND year_start <= p_start_date AND year_end >= p_start_date;
    END IF;
  END IF;

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

GRANT EXECUTE ON FUNCTION edit_approved_leave_request(uuid, text, date, date, int, text, int) TO authenticated;
