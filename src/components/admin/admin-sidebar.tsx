"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Award,
  ClipboardCheck,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Globe,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

interface AdminSidebarProps {
  adminEmail?: string;
}

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/programs", label: "Programs & Tasks", icon: Layers3 },
  { href: "/admin/submissions", label: "Project Reviews", icon: ClipboardCheck },
  { href: "/admin/payments", label: "Payment Verification", icon: CreditCard },
  { href: "/admin/enrollments", label: "Enrollments", icon: GraduationCap },
  { href: "/admin/documents", label: "Certificates & Docs", icon: Award },
  { href: "/admin/students", label: "Students Directory", icon: Users },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  function isLinkActive(itemHref: string, exact?: boolean) {
    if (exact) return pathname === itemHref;
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
  }

  const currentItem = navItems.find((item) => isLinkActive(item.href, item.exact));
  const pageTitle = currentItem?.label ?? "Admin Panel";

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#151F32]">
      <div>
        {/* Top Header / Branding */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF3FF] text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#101D35] dark:text-[#F1F5FB]">
                  Crewline Admin
                </span>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950" />
              </div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Management Console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin sidebar"
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#1C2940] dark:hover:text-slate-200 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav aria-label="Admin Navigation" className="p-3">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Main Management
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.href, item.exact);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-[#EAF3FF] text-[#1769D2] shadow-xs dark:bg-blue-950/60 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={active ? "text-[#1769D2] dark:text-blue-300" : "text-slate-400 dark:text-slate-500"}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quick Links
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/"
                target="_blank"
                rel="noreferrer"
                className="focus-ring flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
              >
                <span className="flex items-center gap-3">
                  <Globe size={17} className="text-slate-400 dark:text-slate-500" />
                  View Website
                </span>
                <ExternalLink size={13} className="text-slate-400 dark:text-slate-500" />
              </Link>
            </li>
            <li>
              <Link
                href="/internships"
                target="_blank"
                rel="noreferrer"
                className="focus-ring flex items-center justify-between rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
              >
                <span className="flex items-center gap-3">
                  <Layers3 size={17} className="text-slate-400 dark:text-slate-500" />
                  Internship Catalog
                </span>
                <ExternalLink size={13} className="text-slate-400 dark:text-slate-500" />
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Admin User & Logout Footer */}
      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#1C2940]">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-xs font-bold text-[#101D35] dark:text-[#F1F5FB]">
                {adminEmail ?? "Administrator"}
              </p>
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Verified Admin</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out of Admin"
              title="Sign out of Admin"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-rose-600 hover:shadow-xs dark:text-[#A8B5C8] dark:hover:bg-[#151F32] dark:hover:text-rose-400"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header Toggle Bar */}
      <div className="sticky top-[72px] z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#151F32] md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300">
            <ShieldCheck size={16} />
          </span>
          <span className="truncate text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Admin / <strong className="text-[#101D35] dark:text-[#F1F5FB]">{pageTitle}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle admin sidebar"
          aria-expanded={mobileOpen}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"
        >
          {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          <span>{mobileOpen ? "Close" : "Admin Menu"}</span>
        </button>
      </div>

      {/* Mobile Off-canvas Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[61] w-72 max-w-[85vw] overflow-y-auto bg-white shadow-2xl dark:bg-[#151F32]">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="sticky top-[88px] hidden h-[calc(100vh-88px)] w-64 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-[#151F32] md:block xl:w-72">
        {sidebarContent}
      </aside>
    </>
  );
}
