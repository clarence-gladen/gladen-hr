export type UserRole = "manager" | "employee";

export type ResidencyStatus = "citizen" | "pr" | "work_permit" | "s_pass";

export type LeaveType = "annual" | "sick" | "hospitalization" | "no_pay";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type DocumentType =
  | "work_permit"
  | "passport"
  | "mom_doc"
  | "employment_contract"
  | "other";

export type ContractStatus = "active" | "completed" | "terminated";

export type ExpenseType = "fixed" | "one_off";

export type PayrollStatus = "draft" | "processing" | "completed";

export type AnnouncementAudience = "all" | "selected";

export type EmployeeStatus = "active" | "inactive";

export type SkillLevel = "basic_skilled" | "higher_skilled";

export interface EmployeeDetail {
  id: string;
  full_name: string;
  nric_last4: string;
  date_of_birth: string | null;
  mobile_number: string;
  residency_status: ResidencyStatus;
  designation: string | null;
  employment_start_date: string;
  employment_end_date: string | null;
  base_salary: number;
  skill_level: SkillLevel;
  bank_name: string | null;
  bank_account_number: string | null;
  status: EmployeeStatus;
}
