"use client";

import { useState } from "react";
import { OvertimeClient } from "./overtime-client";
import { OtLogClient, type OtLogRow } from "./ot-log-client";

type Employee = { id: string; full_name: string };
type Site = { id: string; client_name: string; site_name: string };

type OtRecord = {
  id: string;
  work_date: string;
  remarks: string | null;
  amount: number;
  employees: { full_name: string } | null;
};

export function OvertimeTabs({
  employees,
  sites,
  records,
  entries,
}: {
  employees: Employee[];
  sites: Site[];
  records: OtRecord[];
  entries: OtLogRow[];
}) {
  const [tab, setTab] = useState<"log" | "payroll">("log");

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-sm font-semibold transition ${
      active ? "bg-brand text-white" : "text-foreground/60"
    }`;

  return (
    <>
      <div className="flex gap-1 rounded-xl bg-black/5 p-1">
        <button type="button" onClick={() => setTab("log")} className={tabClass(tab === "log")}>
          OT Log
        </button>
        <button type="button" onClick={() => setTab("payroll")} className={tabClass(tab === "payroll")}>
          Payroll OT (S$)
        </button>
      </div>

      {tab === "log" ? (
        <OtLogClient employees={employees} sites={sites} entries={entries} />
      ) : (
        <OvertimeClient employees={employees} records={records} />
      )}
    </>
  );
}
