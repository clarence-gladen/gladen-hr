-- ============================================================
-- LEAVE BACKFILL — May/June/July 2026
-- Mirrors the pattern used by createLeaveForEmployeeAction:
--   1. INSERT leave_requests with status='pending'
--   2. PERFORM approve_leave_request(id) — updates leave_balances
--
-- Each employee block is wrapped in its own BEGIN/EXCEPTION so
-- a single failure does not abort the rest of the script.
--
-- Day counts are based on 5-day work week (Mon–Fri).
-- NOTE: Cheok Soon Teck 30 May (Saturday) skipped — 0 working days.
-- ============================================================

DO $$
DECLARE
  v_emp_id uuid;
  v_req_id uuid;
BEGIN

  -- ── 1. BABU A/L YEGAMBARAM ──────────────────────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Babu%Yegambaram%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Babu A/L Yegambaram — skipped';
    ELSE
      -- 28–30 May (Thu+Fri = 2 working days; Sat skipped)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-05-28', '2026-05-30', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 2 June (Tue = 1 day)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-02', '2026-06-02', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Babu A/L Yegambaram: %', SQLERRM;
  END;

  -- ── 2. CHEOK SOON TECK ──────────────────────────────────
  -- 30 May = Saturday (skipped). Only 2 June inserted.
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Cheok Soon Teck%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Cheok Soon Teck — skipped';
    ELSE
      -- 2 June (Tue = 1 day)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-02', '2026-06-02', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 23–25 June MC (Tue+Wed+Thu = 3 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-23', '2026-06-25', 3, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Cheok Soon Teck: %', SQLERRM;
  END;

  -- ── 3. NARISH KUMAR (3 Jun, 9 Jun, 15 Jun — all no pay) ─
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Narish Kumar%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Narish Kumar — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'no_pay', '2026-06-03', '2026-06-03', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'no_pay', '2026-06-09', '2026-06-09', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'no_pay', '2026-06-15', '2026-06-15', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Narish Kumar: %', SQLERRM;
  END;

  -- ── 4. HYRUNSA BEEVI D/O MALUKUMIAN — 5 Jun MC ──────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Beevi%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Hyrunsa Beevi — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-05', '2026-06-05', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Hyrunsa Beevi: %', SQLERRM;
  END;

  -- ── 5. JUMARI BIN SUPARGI — 5–18 Jun hospital ───────────
  -- Working days: 5(Fri),8,9,10,11,12,15,16,17,18 = 10 days
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Jumari%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Jumari Bin Supargi — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'hospitalization', '2026-06-05', '2026-06-18', 10, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Jumari Bin Supargi: %', SQLERRM;
  END;

  -- ── 6. PEH LIAN SIN — 9–10 Jun MC ──────────────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Peh Lian Sin%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Peh Lian Sin — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-09', '2026-06-10', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Peh Lian Sin: %', SQLERRM;
  END;

  -- ── 7. NG BEE ENG (Irene) — 9 Jun leave ────────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Ng Bee Eng%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Ng Bee Eng — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-09', '2026-06-09', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Ng Bee Eng: %', SQLERRM;
  END;

  -- ── 8. VICKNESWARI MANICKAM — 9 Jun & 22–24 Jun leave ───
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Vickneswari%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Vickneswari Manickam — skipped';
    ELSE
      -- 9 June (1 day)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-09', '2026-06-09', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 22–24 June (Mon+Tue+Wed = 3 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-22', '2026-06-24', 3, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Vickneswari Manickam: %', SQLERRM;
  END;

  -- ── 9. MAK KAM CHOON — 9–10 Jun MC + 15–26 Jun no pay ──
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Mak Kam Choon%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Mak Kam Choon — skipped';
    ELSE
      -- 9–10 June MC (Tue+Wed = 2 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-09', '2026-06-10', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 15–26 June no pay (Mon–Fri × 2 weeks = 10 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'no_pay', '2026-06-15', '2026-06-26', 10, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Mak Kam Choon: %', SQLERRM;
  END;

  -- ── 10. LEONG PENG KUEN — 12 Jun MC ─────────────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Leong Peng%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Leong Peng Kuen — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-12', '2026-06-12', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Leong Peng Kuen: %', SQLERRM;
  END;

  -- ── 11. ZHU ZHENG LI — 15 Jun MC ────────────────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Zhu Zheng Li%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Zhu Zheng Li — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-15', '2026-06-15', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Zhu Zheng Li: %', SQLERRM;
  END;

  -- ── 12. KWAN TUCK FATT — 17–18 Jun leave + 26 Jun MC ────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Kwan Tuck Fatt%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Kwan Tuck Fatt — skipped';
    ELSE
      -- 17–18 June (Wed+Thu = 2 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-17', '2026-06-18', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 26 June MC (Fri = 1 day)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-26', '2026-06-26', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Kwan Tuck Fatt: %', SQLERRM;
  END;

  -- ── 13. THASHINI SRI S PERIANAN — 17 Jun & 30 Jun–1 Jul ─
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Thashini%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Thashini Sri S Perianan — skipped';
    ELSE
      -- 17 June no pay (Wed = 1 day)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'no_pay', '2026-06-17', '2026-06-17', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 30 June–1 July no pay (Tue+Wed = 2 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'no_pay', '2026-06-30', '2026-07-01', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Thashini Sri S Perianan: %', SQLERRM;
  END;

  -- ── 14. MOHD HISAM BIN BARAH — 22 Jun leave ─────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Hisam%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Mohd Hisam Bin Barah — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-22', '2026-06-22', 1, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Mohd Hisam Bin Barah: %', SQLERRM;
  END;

  -- ── 15. R ASHA DEVI — 24–25 Jun MC ──────────────────────
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Asha%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: R Asha Devi — skipped';
    ELSE
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-24', '2026-06-25', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – R Asha Devi: %', SQLERRM;
  END;

  -- ── 16. RAGINI L DORAIRAJU — 25–26 Jun MC + 29–30 Jun leave
  BEGIN
    SELECT id INTO v_emp_id FROM employees
      WHERE full_name ILIKE '%Ragini%' LIMIT 1;
    IF v_emp_id IS NULL THEN
      RAISE NOTICE 'Not found: Ragini L Dorairaju — skipped';
    ELSE
      -- 25–26 June MC (Thu+Fri = 2 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'sick', '2026-06-25', '2026-06-26', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);

      -- 29–30 June leave (Mon+Tue = 2 days)
      INSERT INTO leave_requests
        (employee_id, leave_type, start_date, end_date, days, status)
      VALUES (v_emp_id, 'annual', '2026-06-29', '2026-06-30', 2, 'pending')
      RETURNING id INTO v_req_id;
      PERFORM approve_leave_request(v_req_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error – Ragini L Dorairaju: %', SQLERRM;
  END;

END $$;
