import Link from "next/link";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerChecklistsPage() {
  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, client_name, site_name, status, checklist_items(count)")
    .eq("status", "active")
    .order("site_name");

  const sites = (contracts ?? []).map((c) => {
    const countRow = Array.isArray(c.checklist_items) ? c.checklist_items[0] : c.checklist_items;
    return {
      id: c.id,
      clientName: c.client_name,
      siteName: c.site_name,
      itemCount: (countRow as { count?: number } | null)?.count ?? 0,
    };
  });

  return (
    <>
      <Header title="Cleaning checklists" />
      <main className="flex-1 px-4 py-6">
        <p className="mb-4 text-sm text-foreground/60">
          Choose a site to manage its daily cleaning tasks. Cleaners with the checklist
          enabled tick these off on site.
        </p>
        {sites.length === 0 ? (
          <p className="text-sm text-foreground/50">No active sites.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
            {sites.map((s) => (
              <li key={s.id} className="border-b border-black/5 last:border-b-0">
                <Link
                  href={`/manager/checklists/${s.id}`}
                  className="flex items-center justify-between px-4 py-4"
                >
                  <div>
                    <p className="text-base font-medium">{s.siteName}</p>
                    <p className="text-sm text-foreground/50">{s.clientName}</p>
                  </div>
                  <span className="text-sm text-foreground/50">
                    {s.itemCount} task{s.itemCount === 1 ? "" : "s"} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
