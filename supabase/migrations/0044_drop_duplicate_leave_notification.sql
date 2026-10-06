-- 0044_drop_duplicate_leave_notification.sql
-- Every new leave request notified each manager twice. Two INSERT triggers on
-- leave_requests both wrote a "New Leave Request" notification:
--   * on_leave_request_submit    -> notify_managers_of_leave_request()  (0017)
--     "<name> has applied for Annual Leave (09 Oct - 14 Oct 2026)"
--   * on_leave_request_submitted -> notify_managers_on_leave_request()
--     "<name> has submitted a leave request."
-- The second was created by hand in Supabase (it is in no migration) and its
-- message is the less useful one. Its reference_id is not read anywhere in the
-- app. Keep the 0017 trigger and drop this one.

DROP TRIGGER IF EXISTS on_leave_request_submitted ON leave_requests;
DROP FUNCTION IF EXISTS notify_managers_on_leave_request();
