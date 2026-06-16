"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NotificationBell({ href }: { href: string }) {
  const [count, setCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { count: c } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      setCount(c ?? 0);

      channelRef.current = supabase
        .channel("notification-bell")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
          setCount((prev) => prev + 1);
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, async () => {
          const { count: fresh } = await supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("is_read", false);
          setCount(fresh ?? 0);
        })
        .subscribe();
    }

    init();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="relative flex items-center justify-center"
      aria-label="Notifications"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
