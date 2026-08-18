import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { todaySG } from "@/lib/utils/date";
import { buildServiceReportData } from "@/lib/reports/service-report";
import { ReportClient, type SiteOption, type ReportItem } from "./report-client";

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, client_name, site_name")
    .eq("status", "active")
    .order("site_name");

  const sites: SiteOption[] = (contracts ?? []).map((c) => ({
    id: c.id,
    label: `${c.site_name} — ${c.client_name}`,
  }));

  // Default the month to the PREVIOUS month (reports are produced in arrears).
  const todayStr = todaySG();
  const curY = Number(todayStr.slice(0, 4));
  const curM = Number(todayStr.slice(5, 7));
  const defY = curM === 1 ? curY - 1 : curY;
  const defM = curM === 1 ? 12 : curM - 1;

  const selectedSite = sp.site && sites.some((s) => s.id === sp.site) ? sp.site : sites[0]?.id;
  const [my, mm] = (sp.month ?? `${defY}-${String(defM).padStart(2, "0")}`).split("-").map(Number);
  const year = my || defY;
  const month = mm || defM;

  if (!selectedSite) {
    return (
      <>
        <Header title="Service reports" />
        <main className="flex-1 px-4 py-6">
          <p className="text-sm text-foreground/50">No active sites.</p>
        </main>
      </>
    );
  }

  // Saved overrides for this site+month, if any.
  const { data: saved } = await supabase
    .from("service_reports")
    .select("remarks, supervisor_name, cover_message, excluded_item_ids")
    .eq("contract_id", selectedSite)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  // All active tasks for the exclude checklist.
  const { data: itemsData } = await supabase
    .from("checklist_items")
    .select("id, description, frequency")
    .eq("contract_id", selectedSite)
    .eq("active", true)
    .order("sort_order");
  const items: ReportItem[] = (itemsData ?? []).map((i) => ({
    id: i.id,
    description: i.description,
    frequency: i.frequency,
  }));

  // Build the preview using saved overrides.
  const data = await buildServiceReportData(supabase, selectedSite, year, month, {
    remarks: saved?.remarks,
    supervisorName: saved?.supervisor_name,
    coverMessage: saved?.cover_message,
    excludedItemIds: saved?.excluded_item_ids ?? [],
  });

  return (
    <ReportClient
      sites={sites}
      selectedSite={selectedSite}
      year={year}
      month={month}
      monthLabel={data?.monthLabel ?? ""}
      items={items}
      tasksInReport={data?.tasks.length ?? 0}
      totalCompletions={data?.totalCompletions ?? 0}
      attendanceDays={data?.attendanceDays.length ?? 0}
      saved={{
        remarks: saved?.remarks ?? "",
        supervisorName: saved?.supervisor_name ?? "",
        coverMessage: saved?.cover_message ?? "",
        excludedItemIds: saved?.excluded_item_ids ?? [],
      }}
    />
  );
}
