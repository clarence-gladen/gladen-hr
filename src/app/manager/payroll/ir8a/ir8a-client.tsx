"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { generateIr8aPdfAction } from "./actions";

export interface EmployeeYearData {
  employeeId: string;
  fullName: string;
  nricLast4: string;
  dateOfBirth: string;
  designation: string | null;
  employmentStartDate: string;
  employmentEndDate: string | null;
  employmentIncome: number;
  bonus: number;
  reimbursement: number;
  cpfEmployee: number;
  cpfEmployer: number;
}

function fmt(n: number): string {
  return `S$${n.toFixed(2)}`;
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-SG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getPeriod(emp: EmployeeYearData, year: number) {
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const start = (emp.employmentStartDate ?? jan1) >= jan1 ? (emp.employmentStartDate ?? jan1) : jan1;
  const end = emp.employmentEndDate && emp.employmentEndDate <= dec31 ? emp.employmentEndDate : dec31;
  return { start, end };
}

function downloadCsv(employees: EmployeeYearData[], year: number) {
  const headers = [
    "Employee Name",
    "NRIC Last 4",
    "Date of Birth",
    "Employment Period Start",
    "Employment Period End",
    "Employment Income (S$)",
    "Bonus (S$)",
    "Gross Income (S$)",
    "CPF Employee (S$)",
    "CPF Employer (S$)",
    "Reimbursements Tax-Exempt (S$)",
  ];

  const rows = employees.map((emp) => {
    const { start, end } = getPeriod(emp, year);
    return [
      emp.fullName,
      emp.nricLast4,
      emp.dateOfBirth,
      start,
      end,
      emp.employmentIncome.toFixed(2),
      emp.bonus.toFixed(2),
      (emp.employmentIncome + emp.bonus).toFixed(2),
      emp.cpfEmployee.toFixed(2),
      emp.cpfEmployer.toFixed(2),
      emp.reimbursement.toFixed(2),
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IR8A_Reference_${year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function EmployeeRow({ emp, year }: { emp: EmployeeYearData; year: number }) {
  const [isPending, startTransition] = useTransition();
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { start, end } = getPeriod(emp, year);

  function handlePdf() {
    setPdfError(null);
    startTransition(async () => {
      const result = await generateIr8aPdfAction(emp.employeeId, year);
      if (result.error) {
        setPdfError(result.error);
      } else if (result.url) {
        window.open(result.url, "_blank");
      }
    });
  }

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{emp.fullName}</p>
          <p className="text-xs text-foreground/50">
            {fmtDate(start)} – {fmtDate(end)}
          </p>
          {emp.designation && (
            <p className="mt-0.5 text-xs text-foreground/40">{emp.designation}</p>
          )}
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handlePdf}
          className="shrink-0 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand disabled:opacity-60"
        >
          {isPending ? "Generating…" : "Download PDF"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-foreground/40">Employment Income</p>
          <p className="font-semibold text-foreground">{fmt(emp.employmentIncome)}</p>
        </div>
        <div>
          <p className="text-foreground/40">Bonus</p>
          <p className="font-semibold text-foreground">{fmt(emp.bonus)}</p>
        </div>
        <div>
          <p className="text-foreground/40">Gross Income</p>
          <p className="font-semibold text-brand">{fmt(emp.employmentIncome + emp.bonus)}</p>
        </div>
        <div>
          <p className="text-foreground/40">CPF Employee</p>
          <p className="font-semibold text-foreground">{fmt(emp.cpfEmployee)}</p>
        </div>
        <div>
          <p className="text-foreground/40">CPF Employer</p>
          <p className="font-semibold text-foreground">{fmt(emp.cpfEmployer)}</p>
        </div>
        {emp.reimbursement > 0 && (
          <div>
            <p className="text-foreground/40">Reimbursements</p>
            <p className="font-semibold text-foreground">{fmt(emp.reimbursement)}</p>
          </div>
        )}
      </div>

      {pdfError && <p className="mt-2 text-xs text-red-600">{pdfError}</p>}
    </li>
  );
}

export function Ir8aClient({
  year,
  employees,
}: {
  year: number;
  employees: EmployeeYearData[];
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2025 + 2 }, (_, i) => 2025 + i);

  return (
    <>
      <Header title="IR8A / Yearly Report" />
      <main className="flex-1 px-4 py-6">
        <Link href="/manager/payroll" className="mb-4 inline-block text-sm font-medium text-brand">
          ← Back to Payroll
        </Link>

        {/* Year selector */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-foreground/60">
            Income Year
          </label>
          <select
            value={year}
            onChange={(e) => router.push(`/manager/payroll/ir8a?year=${e.target.value}`)}
            className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} (YA {y + 1})
              </option>
            ))}
          </select>
        </div>

        {/* Info banner */}
        <div className="mb-4 rounded-xl bg-brand/5 px-4 py-3 text-xs text-brand">
          <p className="font-semibold">
            Year of Assessment (YA) {year + 1} — Income earned Jan–Dec {year}
          </p>
          <p className="mt-1 text-brand/70">
            Submit via IRAS myTax Portal (Corppass) using AIS. Full NRIC/FIN is required for AIS — this report uses the last 4 digits only.
          </p>
        </div>

        {employees.length === 0 ? (
          <p className="text-center text-sm text-foreground/60">
            No completed payslips found for {year}. Finalise payroll runs for this year first.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-foreground/60">
                {employees.length} employee{employees.length !== 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={() => downloadCsv(employees, year)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
              >
                Export CSV
              </button>
            </div>
            <ul className="space-y-3">
              {employees.map((emp) => (
                <EmployeeRow key={emp.employeeId} emp={emp} year={year} />
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
