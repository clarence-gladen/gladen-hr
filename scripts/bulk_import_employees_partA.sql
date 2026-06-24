-- ============================================================
-- BULK EMPLOYEE IMPORT — PART A (Employees 1–24)
-- Run Part A first, then Part B, then Part C.
--
-- Placeholder mobile numbers used (6500000001 – 6500000048).
-- Employees cannot log in until you update their real mobile
-- number via Manager > Employees > Edit.
--
-- Existing employees matched by nric_last4 are skipped.
-- ============================================================

DO $$
DECLARE
  v_key text := '4bbcf05a7d6a278797d99fbe43f0e4eb08d784810e2a46166f1f4748d2de7d50';
BEGIN

  -- 1. HYRUNSA BEEVI D/O MALUKUMIAN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '690B') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'HYRUNSA BEEVI D/O MALUKUMIAN', encrypt_nric('S1401690B', v_key), '690B', '1960-04-06',
      '6500000001', 'citizen', 'Cleaner',
      '2018-04-02', 1750.00, 5, 'active'
    );
  END IF;

  -- 2. CHAN YAN SIEW
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '793E') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'CHAN YAN SIEW', encrypt_nric('S1368793E', v_key), '793E', '1959-01-05',
      '6500000002', 'citizen', 'Cleaner',
      '2023-02-01', 1780.00, 5, 'active'
    );
  END IF;

  -- 3. CHEOK SOON TECK
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '669B') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'CHEOK SOON TECK', encrypt_nric('S1349669B', v_key), '669B', '1959-02-20',
      '6500000003', 'citizen', 'Cleaner',
      '2020-09-10', 1780.00, 5, 'active'
    );
  END IF;

  -- 4. CLARENCE GOH YAORONG (skipped if already exists)
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '933G') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'CLARENCE GOH YAORONG', encrypt_nric('S9340933G', v_key), '933G', '1993-10-23',
      '6500000004', 'citizen', 'Cleaner',
      '2016-07-01', 3800.00, 5, 'active'
    );
  END IF;

  -- 5. DEVAKI ARUMUGAM
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '327P') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'DEVAKI ARUMUGAM', encrypt_nric('M3482327P', v_key), '327P', '1994-07-29',
      '6500000005', 'work_permit', 'Cleaner',
      '2025-10-16', 1000.00, 5, 'active'
    );
  END IF;

  -- 6. DEWI SHINTA KHE
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '786A') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'DEWI SHINTA KHE', encrypt_nric('S6982786A', v_key), '786A', '1969-01-06',
      '6500000006', 'citizen', 'Cleaner',
      '2012-03-05', 1800.00, 5, 'active'
    );
  END IF;

  -- 7. GOH HAN TECK
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '237Z') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'GOH HAN TECK', encrypt_nric('S1443237Z', v_key), '237Z', '1960-06-06',
      '6500000007', 'citizen', 'Cleaner',
      '2016-04-01', 1600.00, 5, 'active'
    );
  END IF;

  -- 8. GOH LAY KHENG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '877B') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'GOH LAY KHENG', encrypt_nric('S6843877B', v_key), '877B', '1968-11-12',
      '6500000008', 'citizen', 'Cleaner',
      '1996-06-05', 7500.00, 5, 'active'
    );
  END IF;

  -- 9. GOH SENG TECK
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '612B') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'GOH SENG TECK', encrypt_nric('S1471612B', v_key), '612B', '1961-09-26',
      '6500000009', 'citizen', 'Cleaner',
      '2010-04-01', 1600.00, 5, 'active'
    );
  END IF;

  -- 10. GOH KAH KIM
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '877A') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'GOH KAH KIM', encrypt_nric('S1361877A', v_key), '877A', '1959-04-22',
      '6500000010', 'citizen', 'Cleaner',
      '2025-08-13', 1800.00, 5, 'active'
    );
  END IF;

  -- 11. HENG TAO NEE
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '170G') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'HENG TAO NEE', encrypt_nric('S1138170G', v_key), '170G', '1954-02-28',
      '6500000011', 'citizen', 'Cleaner',
      '2019-04-16', 1900.00, 5, 'active'
    );
  END IF;

  -- 12. JAYA MURTY A/L SALAYA
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '172M') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'JAYA MURTY A/L SALAYA', encrypt_nric('G7295172M', v_key), '172M', '1975-09-16',
      '6500000012', 'work_permit', 'Cleaner',
      '2008-07-22', 1600.00, 5, 'active'
    );
  END IF;

  -- 13. JEANY WANG YU TING
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '808D') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'JEANY WANG YU TING', encrypt_nric('S9074808D', v_key), '808D', '1990-11-12',
      '6500000013', 'citizen', 'Cleaner',
      '2018-12-01', 1600.00, 5, 'active'
    );
  END IF;

  -- 14. JUMARI BIN SUPARGI
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '487H') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'JUMARI BIN SUPARGI', encrypt_nric('S1187487H', v_key), '487H', '1956-02-10',
      '6500000014', 'citizen', 'Cleaner',
      '2022-06-04', 1850.00, 5, 'active'
    );
  END IF;

  -- 15. KAN KIN MENG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '574C') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'KAN KIN MENG', encrypt_nric('S1178574C', v_key), '574C', '1956-07-28',
      '6500000015', 'citizen', 'Cleaner',
      '2022-06-14', 1750.00, 5, 'active'
    );
  END IF;

  -- 16. KWAN TUCK FATT
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '380H') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'KWAN TUCK FATT', encrypt_nric('S1405380H', v_key), '380H', '1960-08-15',
      '6500000016', 'citizen', 'Cleaner',
      '2024-03-16', 1780.00, 5, 'active'
    );
  END IF;

  -- 17. LATIFAH BINTE ZAINO
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '747H') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'LATIFAH BINTE ZAINO', encrypt_nric('S1831747H', v_key), '747H', '1967-10-23',
      '6500000017', 'citizen', 'Cleaner',
      '2023-08-14', 1780.00, 5, 'active'
    );
  END IF;

  -- 18. LAU SWEE HUAY
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '949E') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'LAU SWEE HUAY', encrypt_nric('S1172949E', v_key), '949E', '1956-02-24',
      '6500000018', 'citizen', 'Cleaner',
      '2023-05-09', 1750.00, 5, 'active'
    );
  END IF;

  -- 19. LEONG PENG KUEN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '117I') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'LEONG PENG KUEN', encrypt_nric('S0314117I', v_key), '117I', '1951-12-19',
      '6500000019', 'citizen', 'Cleaner',
      '2019-09-03', 1900.00, 5, 'active'
    );
  END IF;

  -- 20. LOW TEW HAI
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '822F') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'LOW TEW HAI', encrypt_nric('S0692822F', v_key), '822F', '1947-10-14',
      '6500000020', 'citizen', 'Cleaner',
      '2024-10-01', 1780.00, 5, 'active'
    );
  END IF;

  -- 21. MAK KAM CHOON
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '735E') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'MAK KAM CHOON', encrypt_nric('S2506735E', v_key), '735E', '1952-09-18',
      '6500000021', 'citizen', 'Cleaner',
      '2022-06-04', 1850.00, 5, 'active'
    );
  END IF;

  -- 22. MOE MYINT AUNG
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '552T') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'MOE MYINT AUNG', encrypt_nric('M4521552T', v_key), '552T', '2000-02-03',
      '6500000022', 'work_permit', 'Cleaner',
      '2025-11-28', 2000.00, 5, 'active'
    );
  END IF;

  -- 23. MOHD HISAM BIN BARAH
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '508I') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'MOHD HISAM BIN BARAH', encrypt_nric('S7041508I', v_key), '508I', '1970-11-27',
      '6500000023', 'citizen', 'Cleaner',
      '2025-11-01', 1600.00, 5, 'active'
    );
  END IF;

  -- 24. NARISH KUMAR
  IF NOT EXISTS (SELECT 1 FROM employees WHERE nric_last4 = '297P') THEN
    INSERT INTO employees (
      full_name, nric_encrypted, nric_last4, date_of_birth,
      mobile_number, residency_status, designation,
      employment_start_date, base_salary, work_days_per_week, status
    ) VALUES (
      'NARISH KUMAR', encrypt_nric('M3299297P', v_key), '297P', '1991-09-16',
      '6500000024', 'work_permit', 'Cleaner',
      '2024-02-08', 1000.00, 5, 'active'
    );
  END IF;

END $$;
