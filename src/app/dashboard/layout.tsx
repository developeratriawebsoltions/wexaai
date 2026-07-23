"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Inbox, Home, Users, Radio, FileText, Bot,
  GitBranch, UsersRound, BarChart2, Plug, Settings,
  CreditCard, HelpCircle, LogOut, User, ChevronDown, Menu, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/overview", label: "Dashboard", icon: Home },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Radio },
  { href: "/dashboard/templates", label: "Templates", icon: FileText },
  { href: "/dashboard/ai-agent", label: "AI Agent", icon: Bot },
  { href: "/dashboard/flows", label: "Flows", icon: GitBranch },
  { href: "/dashboard/team", label: "Team", icon: UsersRound },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, workspace, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [usage, setUsage] = useState<{ messages: number; plan: { messagesLimit: number; name: string } | null } | null>(null);

  useEffect(() => {
    const fetchUnread = () => {
      fetch("/api/inbox/unread", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setUnreadCount(d.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);

    fetch("/api/billing/usage", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUsage({ messages: d.messages ?? 0, plan: d.plan ?? null }))
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#e5e7eb] px-3 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="w-9" />
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static h-screen md:h-full w-64 md:w-72 flex-shrink-0 flex-col justify-between border-r border-[#e5e7eb] bg-white py-4 md:py-5 z-30 transition-transform duration-300 overflow-hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="flex-1 overflow-y-auto">
          {/* Logo + Workspace - Hidden on Mobile (shown in header) */}
          <div className="mb-6 px-4 hidden md:block">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-sm font-bold text-white">
                W
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm md:text-base font-extrabold text-gray-900">
                  {workspace?.name ?? "Wexa AI"}
                </p>
                <p className="text-[11px] md:text-xs capitalize text-gray-400">{workspace?.plan ?? "free"} plan</p>
              </div>
            </div>
          </div>

          {/* Mobile spacing */}
          <div className="mb-4 md:hidden" />

          <nav className="space-y-0.5 px-2 md:px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-2 md:px-3 py-2 md:py-2.5 text-sm md:text-base font-bold transition-colors ${
                    active ? "bg-green-600 text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={16} className="md:w-[17px] md:h-[17px] flex-shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {label === "Inbox" && unreadCount > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] md:text-xs font-bold flex-shrink-0 ${active ? "bg-white text-green-600" : "bg-green-600 text-white"}`}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}
        <div className="px-3 border-t border-gray-100 pt-3 mt-3 md:mt-0 md:border-t-0 md:pt-0 md:pb-0 space-y-3 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 md:p-3">
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500">Current Plan</p>
            <div className="mt-1.5 md:mt-2 flex items-center justify-between">
              <span className="text-sm md:text-base font-bold capitalize text-gray-900">
                {usage?.plan?.name ?? workspace?.plan ?? "Free"} Plan
              </span>
              <Link
                href="/dashboard/billing"
                className="rounded-md bg-green-600 px-1.5 md:px-2 py-0.5 text-[10px] md:text-xs font-bold text-white hover:bg-green-700"
              >
                Upgrade
              </Link>
            </div>
            <p className="mt-1.5 text-[10px] md:text-xs font-semibold text-gray-600">Messages</p>
            <div className="mt-1 flex items-center justify-between text-[10px] md:text-xs font-semibold text-gray-700">
              {(() => {
                const used = usage?.messages ?? 0;
                const limit = usage?.plan?.messagesLimit ?? 0;
                const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                return (
                  <>
                    <span>
                      {used.toLocaleString()} / {limit > 0 ? limit.toLocaleString() : "—"}
                    </span>
                    <span>{limit > 0 ? `${pct}%` : "—"}</span>
                  </>
                );
              })()}
            </div>
            <div className="mt-1 md:mt-1.5 h-1 md:h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${
                    usage?.plan?.messagesLimit && usage.plan.messagesLimit > 0
                      ? Math.min(100, Math.round((usage.messages / usage.plan.messagesLimit) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex w-full items-center gap-2 md:gap-2.5 rounded-lg px-2 py-1.5 md:py-2 hover:bg-gray-100"
            >
              <div className="flex h-7 md:h-8 w-7 md:w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] md:text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-xs md:text-sm font-bold text-gray-900">{user?.name ?? "..."}</p>
                <p className="truncate text-[10px] md:text-xs text-gray-500">{user?.email ?? "..."}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <User size={13} /> My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  <Settings size={13} /> Settings
                </Link>
                <hr className="my-1 border-gray-100" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={13} /> Logout
                </button>
              </div>
            )}
          </div>

          <Link href="#" className="flex items-center gap-2 rounded-lg px-2 py-1.5 md:py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            <HelpCircle size={16} className="flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-800">Need help?</p>
              <p className="text-[10px] md:text-xs text-gray-500">Contact Support</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-y-auto mt-16 md:mt-0">{children}</main>
    </div>
  );
}
