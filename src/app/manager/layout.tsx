import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, type NavItem } from "@/components/bottom-nav";

const navItems: NavItem[] = [
  { href: "/manager", labelKey: "nav.home", icon: "🏠" },
  { href: "/manager/employees", labelKey: "nav.employees", icon: "👥" },
  { href: "/manager/payroll", labelKey: "nav.payroll", icon: "💰" },
  { href: "/manager/leave", labelKey: "nav.leave", icon: "📅" },
  { href: "/manager/more", labelKey: "nav.more", icon: "⋯" },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.role !== "manager") {
    redirect("/employee");
  }

  return (
    <div className="flex min-h-screen flex-col pb-16">
      {children}
      <BottomNav items={navItems} />
    </div>
  );
}
