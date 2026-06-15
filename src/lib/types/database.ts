export type UserRole = "manager" | "employee";

export type ResidencyStatus = "citizen" | "pr" | "work_permit" | "s_pass";

export type LeaveType = "annual" | "sick" | "hospitalization";

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
