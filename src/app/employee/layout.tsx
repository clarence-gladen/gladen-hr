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
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.role === "manager") {
    redirect("/manager");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col pb-[calc(4rem+max(env(safe-area-inset-bottom),_8px))]">
        {children}
        <BottomNav items={navItems} />
      </div>
    </ToastProvider>
  );
}
