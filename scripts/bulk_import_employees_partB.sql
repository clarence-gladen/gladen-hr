-- ============================================================
-- BULK EMPLOYEE IMPORT — PART B (Employees 25–48)
-- Run after Part A.
-- ============================================================

DO $$
DECLARE
  v_key text := '4bbcf05a7d6a278797d99fbe43f0e4eb08d784810e2a46166f1f4748d2de7d50';
BEGIN

  -- 25. NG KOK CHENG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '326C') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'NG KOK CHENG', encrypt_nric('S0217326C', v_key), '326C', '1951-11-12',
      '6500000025', 'citizen', 'Cleaner',
      '2019-04-01', 1870.00, 5, 'active'
    );
  END IF;

  -- 26. NG BEE ENG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '574E') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'NG BEE ENG', encrypt_nric('S0888574E', v_key), '574E', '1951-04-01',
      '6500000026', 'citizen', 'Cleaner',
      '2025-08-01', 1800.00, 5, 'active'
    );
  END IF;

  -- 27. NGUYEN TRUNG THANG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '713N') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'NGUYEN TRUNG THANG', encrypt_nric('G3849713N', v_key), '713N', '1987-08-16',
      '6500000027', 'work_permit', 'Cleaner',
      '2022-01-03', 2200.00, 5, 'active'
    );
  END IF;

  -- 28. PARVATHY A/P M MUTHU (Malaysian IC — spaces and dash stripped)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '7663') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'PARVATHY A/P M MUTHU', encrypt_nric('37177663', v_key), '7663', '1963-10-12',
      '6500000028', 'work_permit', 'Cleaner',
      '2019-03-28', 1000.00, 5, 'active'
    );
  END IF;

  -- 29. PATHMA VIJYAN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '647U') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'PATHMA VIJYAN', encrypt_nric('G8633647U', v_key), '647U', '1988-12-03',
      '6500000029', 'work_permit', 'Cleaner',
      '2025-04-02', 1500.00, 5, 'active'
    );
  END IF;

  -- 30. PEH LIAN CHOON
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '016E') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'PEH LIAN CHOON', encrypt_nric('S0956016E', v_key), '016E', '1951-11-27',
      '6500000030', 'citizen', 'Cleaner',
      '2017-12-01', 1300.00, 5, 'active'
    );
  END IF;

  -- 31. PEH LIAN SIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '438Z') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'PEH LIAN SIN', encrypt_nric('S0209438Z', v_key), '438Z', '1953-09-26',
      '6500000031', 'citizen', 'Cleaner',
      '2020-08-31', 1750.00, 5, 'active'
    );
  END IF;

  -- 32. RAGINI L DORAIRAJU (Malaysian IC — spaces and dash stripped)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '3053') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'RAGINI L DORAIRAJU', encrypt_nric('40123053', v_key), '3053', '1983-12-28',
      '6500000032', 'work_permit', 'Cleaner',
      '2016-05-09', 1050.00, 5, 'active'
    );
  END IF;

  -- 33. SABINA BINTI HAJI ZAWAWI (Malaysian IC — spaces stripped)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '3259') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'SABINA BINTI HAJI ZAWAWI', encrypt_nric('403963259', v_key), '3259', '1979-07-04',
      '6500000033', 'work_permit', 'Cleaner',
      '2018-07-09', 1000.00, 5, 'active'
    );
  END IF;

  -- 34. SURIAKALA MANIANDI
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '851P') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'SURIAKALA MANIANDI', encrypt_nric('M3428851P', v_key), '851P', '1979-08-29',
      '6500000034', 'work_permit', 'Cleaner',
      '2024-08-05', 1000.00, 5, 'active'
    );
  END IF;

  -- 35. TAN JIA YI
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '790B') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'TAN JIA YI', encrypt_nric('T0321790B', v_key), '790B', '2003-08-07',
      '6500000035', 'citizen', 'Cleaner',
      '2021-10-12', 1600.00, 5, 'active'
    );
  END IF;

  -- 36. TAN KENG CHYE
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '496I') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'TAN KENG CHYE', encrypt_nric('S1673496I', v_key), '496I', '1964-09-07',
      '6500000036', 'citizen', 'Cleaner',
      '1996-06-05', 7500.00, 5, 'active'
    );
  END IF;

  -- 37. TAN XIN YI
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '321I') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'TAN XIN YI', encrypt_nric('T0537321I', v_key), '321I', '2005-12-26',
      '6500000037', 'citizen', 'Cleaner',
      '2019-01-01', 1600.00, 5, 'active'
    );
  END IF;

  -- 38. TAN SUAN KEOW
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '558H') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'TAN SUAN KEOW', encrypt_nric('S7610558H', v_key), '558H', '1976-04-18',
      '6500000038', 'citizen', 'Cleaner',
      '2025-01-01', 1600.00, 5, 'active'
    );
  END IF;

  -- 39. THANG MUN MANG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '316T') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'THANG MUN MANG', encrypt_nric('M4405316T', v_key), '316T', '2001-11-23',
      '6500000039', 'work_permit', 'Cleaner',
      '2023-11-11', 2000.00, 5, 'active'
    );
  END IF;

  -- 40. THASHINI SRI S PERIANAN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '195J') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'THASHINI SRI S PERIANAN', encrypt_nric('S9074195J', v_key), '195J', '1990-01-25',
      '6500000040', 'citizen', 'Cleaner',
      '2024-10-11', 1800.00, 5, 'active'
    );
  END IF;

  -- 41. WAN CHEE SENG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '577B') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'WAN CHEE SENG', encrypt_nric('S1486577B', v_key), '577B', '1961-09-01',
      '6500000041', 'citizen', 'Cleaner',
      '2023-05-22', 1780.00, 5, 'active'
    );
  END IF;

  -- 42. WANG YING (Malaysian IC — spaces stripped)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '0908') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'WANG YING', encrypt_nric('076060908', v_key), '0908', '1987-04-11',
      '6500000042', 'work_permit', 'Cleaner',
      '2014-02-20', 1100.00, 5, 'active'
    );
  END IF;

  -- 43. WANG ZHEN (Malaysian IC — spaces stripped)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '9389') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'WANG ZHEN', encrypt_nric('077689389', v_key), '9389', '1992-08-26',
      '6500000043', 'work_permit', 'Cleaner',
      '2019-11-25', 1100.00, 5, 'active'
    );
  END IF;

  -- 44. CHEN YA JUN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '899D') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'CHEN YA JUN', encrypt_nric('S7275899D', v_key), '899D', '1972-02-03',
      '6500000044', 'citizen', 'Cleaner',
      '2012-11-01', 800.00, 5, 'active'
    );
  END IF;

  -- 45. ZHU ZHENG LI
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '069T') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'ZHU ZHENG LI', encrypt_nric('G6650069T', v_key), '069T', '1978-12-17',
      '6500000045', 'work_permit', 'Cleaner',
      '2023-02-10', 1000.00, 5, 'active'
    );
  END IF;

  -- 46. ZIN THU HTET
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '174K') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'ZIN THU HTET', encrypt_nric('M4230174K', v_key), '174K', '1993-05-30',
      '6500000046', 'work_permit', 'Cleaner',
      '2022-04-24', 2100.00, 5, 'active'
    );
  END IF;

  -- 47. ESWAARAN A/L GANESAN (Newly Joined)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '410J') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'ESWAARAN A/L GANESAN', encrypt_nric('M3290410J', v_key), '410J', '1996-02-04',
      '6500000047', 'work_permit', 'Cleaner',
      '2025-12-08', 1200.00, 5, 'active'
    );
  END IF;

  -- 48. SAHBI BIN MANOR (Resigned)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '171D') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, employment_end_date,
      base_salary, work_days_per_week, status
    ) VALUES (
      'SAHBI BIN MANOR', encrypt_nric('S0989171D', v_key), '171D', '1954-10-02',
      '6500000048', 'citizen', 'Cleaner',
      '2025-09-18', '2025-12-14',
      2000.00, 5, 'inactive'
    );
  END IF;

END $$;
