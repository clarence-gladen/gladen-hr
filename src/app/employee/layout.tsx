import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, type NavItem } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast";

const navItems: NavItem[] = [
  { href: "/employee", labelKey: "nav.home", icon: "🏠" },
  { href: "/employee/leave", labelKey: "nav.leave", icon: "📅" },
  { href: "/employee/payslips", labelKey: "nav.payslips", icon: "🧾" },
  {
    href: "/employee/announcements",
    labelKey: "nav.announcements",
    icon: "🔔",
  },
  { href: "/employee/profile", labelKey: "nav.profile", icon: "👤" },
];

export default async function EmployeeLayout({
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
    .select("role, employees(is_supervisor)")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.role === "manager") {
    redirect("/manager");
  }

  const employee = Array.isArray(profile?.employees)
    ? profile?.employees[0]
    : profile?.employees;
  const isSupervisor = Boolean(employee?.is_supervisor);

  const items: NavItem[] = isSupervisor
    ? [
        ...navItems.slice(0, 2),
        { href: "/employee/ot", labelKey: "nav.ot", icon: "⏰" },
        ...navItems.slice(2),
      ]
    : navItems;

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col pb-[calc(4rem+max(env(safe-area-inset-bottom),_8px))]">
        {children}
        <BottomNav items={items} />
      </div>
    </ToastProvider>
  );
}
