"use client";

import { EmployeeForm } from "../employee-form";
import { createEmployeeAction } from "../actions";

export default function NewEmployeePage() {
  return <EmployeeForm titleKey="employees.addEmployee" action={createEmployeeAction} />;
}
