"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import type { User } from "@supabase/supabase-js";
import { STUDENT_NOTIFICATIONS, STUDENT_CART_ITEMS } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";

interface NavChild {
  label: string;
  href: string;
  dot?: string;
}
interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid_view", href: "/dashboard" },
  // Difficulty filtering already lives on the /problems and /sql pages
  // themselves, so the sidebar no longer duplicates it as an expandable
  // submenu — both are plain links now, consistent with each other.
  { id: "problems", label: "Programming", icon: "code", href: "/problems" },
  { id: "sql", label: "SQL", icon: "database", href: "/sql" },
  { id: "leaderboard", label: "Leaderboard", icon: "emoji_events", href: "/leaderboard" },
  { id: "submissions", label: "Submissions", icon: "description", href: "/submissions" },
  { id: "bookmarks", label: "Bookmarks", icon: "bookmark", href: "/bookmarks" },
  { id: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = NAV_ITEMS.find((n) => pathname?.startsWith(n.href))?.id;

  const [openGroup, setOpenGroup] = useState<string | null>(activeId && NAV_ITEMS.find((n) => n.id === activeId)?.children ? activeId : null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const unreadCount = STUDENT_NOTIFICATIONS.filter((n) => n.unread).length;

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }
      setAuthUser(session.user);
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const displayName = authUser?.user_metadata?.full_name ?? authUser?.email ?? "User";
  const initials = displayName.split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const searchResults = useMemo((): { id: number; title: string; difficulty: string; href: string; kind: string }[] => {
    return [];
  }, []);

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
            if (item.children) {
              const isOpen = openGroup === item.id;
              return (
                <div key={item.id} className="space-y-1">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenGroup(isOpen ? null : item.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-medium hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer",
                      active ? "text-white" : "text-white/80"
                    )}
                  >
                    <Link href={item.href} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      <span className="font-label-md text-label-md">{item.label}</span>
                    </Link>
                    <span className={clsx("material-symbols-outlined text-[18px] transition-transform duration-200", isOpen && "rotate-180")}>
                      expand_more
                    </span>
                  </div>
                  {isOpen && (
                    <div className="pl-8 pr-2 space-y-1">
                      {item.children.map((c) => (
                        <Link
                          key={c.label}
                          href={c.href}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/80 font-medium hover:text-white hover:bg-white/5 transition-all duration-200"
                        >
                          <span className={clsx("w-1.5 h-1.5 rounded-full", c.dot ?? "bg-secondary-fixed-dim")} />
                          <span className="font-label-md text-label-md">{c.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
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
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-surface border-b border-outline-variant/20 h-16 flex items-center gap-3 px-4 md:px-8 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden md:block text-on-surface-variant hover:bg-surface-container-highest/50 rounded-lg p-2 transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex-1 min-w-0 max-w-md">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                placeholder="Search problems..."
                className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary transition-colors"
              />
              {searchOpen && searchQuery.trim() && (
                <div className="absolute left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-card overflow-hidden z-30">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-6 text-center font-label-md text-label-md text-on-surface-variant">No problems match &quot;{searchQuery}&quot;.</p>
                  ) : (
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {searchResults.map((r) => (
                        <Link
                          key={`${r.kind}-${r.id}`}
                          href={r.href}
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-0"
                        >
                          <span className="font-body-md text-body-md text-on-surface truncate">{r.title}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{r.kind}</span>
                            <span className="font-label-sm text-label-sm font-medium text-on-surface-variant">{r.difficulty}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            <div className="relative">
              <button
                type="button"
                onClick={() => { setNotifOpen((v) => !v); setCartOpen(false); }}
                className="w-9 h-9 shrink-0 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest/50 rounded-full transition-colors relative"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface" />}
              </button>
              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-card overflow-hidden z-30"
                  onMouseLeave={() => setNotifOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                    <p className="font-body-md text-body-md font-bold text-on-surface">Notifications</p>
                    {unreadCount > 0 && <span className="font-label-sm text-label-sm text-secondary font-semibold">{unreadCount} new</span>}
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {STUDENT_NOTIFICATIONS.map((n, i) => (
                      <div key={i} className={clsx("flex items-start gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-0", n.unread && "bg-secondary/5")}>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: n.iconBg }}>
                          <span className="material-symbols-outlined text-[18px]" style={{ color: n.iconColor }}>{n.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body-md text-body-md font-medium text-on-surface">{n.title}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">{n.subtitle}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant/70 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setCartOpen((v) => !v); setNotifOpen(false); }}
                className="w-9 h-9 shrink-0 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest/50 rounded-full transition-colors relative"
              >
                <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
                {STUDENT_CART_ITEMS.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-secondary text-white text-[10px] font-bold flex items-center justify-center">
                    {STUDENT_CART_ITEMS.length}
                  </span>
                )}
              </button>
              {cartOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-card overflow-hidden z-30"
                  onMouseLeave={() => setCartOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-outline-variant/10">
                    <p className="font-body-md text-body-md font-bold text-on-surface">Cart</p>
                  </div>
                  {STUDENT_CART_ITEMS.length === 0 ? (
                    <p className="px-4 py-6 text-center font-label-md text-label-md text-on-surface-variant">Your cart is empty.</p>
                  ) : (
                    <>
                      <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {STUDENT_CART_ITEMS.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3 border-b border-outline-variant/10 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="font-body-md text-body-md font-medium text-on-surface">{item.name}</p>
                              <p className="font-label-sm text-label-sm text-on-surface-variant">{item.description}</p>
                            </div>
                            <span className="font-label-md text-label-md font-bold text-secondary shrink-0">{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3">
                        <button
                          type="button"
                          className="w-full bg-primary-container text-white py-2 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors"
                        >
                          Checkout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-outline-variant/30 mx-1 sm:mx-2 shrink-0" />
            <div className="relative">
              <button
                type="button"
                onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); setCartOpen(false); }}
                className="flex items-center gap-2 hover:bg-surface-container-highest/30 py-1 px-2 rounded-full transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold font-label-md">
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
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    <div>
                      <p className="font-body-md text-body-md font-medium text-on-surface">Profile</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">View and edit your profile</p>
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
                      <p className="font-label-sm text-label-sm text-on-surface-variant">Sign out of your account</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      </div>

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
              <span className="font-label-sm text-label-sm truncate w-full text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
