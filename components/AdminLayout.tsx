"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import type { User } from "@supabase/supabase-js";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid_view", href: "/admin/dashboard" },
  { id: "programming-problems", label: "Programming Problems", shortLabel: "Programming", icon: "code", href: "/admin/programming-problems" },
  { id: "sql-problems", label: "SQL Problems", shortLabel: "SQL", icon: "database", href: "/admin/sql-problems" },
  { id: "students", label: "Students", icon: "group", href: "/admin/students" },
  { id: "purchases", label: "Purchases", icon: "receipt_long", href: "/admin/purchases" },
  { id: "submissions", label: "Submissions", icon: "description", href: "/admin/submissions" },
  { id: "leaderboard", label: "Leaderboard", icon: "emoji_events", href: "/admin/leaderboard" },
  { id: "settings", label: "Settings", icon: "settings", href: "/admin/settings" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = NAV_ITEMS.find((n) => pathname?.startsWith(n.href))?.id;

  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/admin/login"); return; }
      const role = user.app_metadata?.role;
      if (role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }
      setAuthUser(user);
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) router.replace("/admin/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const displayName = authUser?.user_metadata?.full_name ?? authUser?.email ?? "Admin";
  const initials = displayName.split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="bg-background text-on-background font-body-md flex h-screen overflow-hidden antialiased">
      <aside
        className={clsx(
          "hidden flex-col bg-primary-container w-[260px] h-screen shrink-0 py-6",
          sidebarOpen && "md:flex"
        )}
      >
        <div className="px-6 mb-8">
          <span className="font-headline-xl text-headline-xl text-surface-container-lowest tracking-tight">{"{R.}"}</span>
          <p className="font-body-md text-body-md text-surface-container-lowest/80 mt-1">Ravi Programming Academy</p>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.id === activeId;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all duration-200",
                  active
                    ? "bg-white/10 text-white font-bold border-l-4 border-secondary-container"
                    : "text-white/80 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-4 mt-4 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-surface border-b border-outline-variant/20 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden md:block text-on-surface-variant hover:bg-surface-container-highest/50 rounded-lg p-2 transition-colors"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 hover:bg-surface-container-highest/30 py-1 px-2 rounded-full transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-bold font-label-md">
                  {initials}
                </div>
                <span className="font-label-md text-label-md text-on-surface hidden sm:block">{displayName}</span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-card overflow-hidden"
                  onMouseLeave={() => setProfileOpen(false)}
                >
                  <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    <div>
                      <p className="font-body-md text-body-md font-medium text-on-surface">Settings</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Admin account settings</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-t border-outline-variant/10 text-left"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">logout</span>
                    <div>
                      <p className="font-body-md text-body-md font-medium text-on-surface">Log Out</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Sign out of the admin console</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      </div>

      <Toaster position="top-right" richColors closeButton />

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-primary-container border-t border-white/10 flex items-stretch overflow-x-auto z-30">
        {NAV_ITEMS.map((item) => {
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 w-16 shrink-0 px-1 transition-colors",
                active ? "text-white" : "text-white/70"
              )}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label-sm text-label-sm truncate w-full text-center leading-tight">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
