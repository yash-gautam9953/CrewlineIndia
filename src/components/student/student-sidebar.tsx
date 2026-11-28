"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Compass,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

interface StudentSidebarProps {
  studentName?: string;
  studentEmail?: string;
}

const mainNavItems = [
  { href: "/account", label: "Workspace Overview", icon: LayoutDashboard, exact: true },
  { href: "/account#internships", label: "My Internships", icon: Briefcase, hash: "#internships" },
  { href: "/account#documents", label: "My Documents", icon: Award, hash: "#documents" },
  { href: "/account#profile", label: "My Profile", icon: UserRound, hash: "#profile" },
];

export function StudentSidebar({ studentName, studentEmail }: StudentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isInternshipWorkspace = pathname.startsWith("/account/internships/");

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#151F32]">
      <div>
        {/* Header / Brand */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF3FF] text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#101D35] dark:text-[#F1F5FB]">
                  Student Portal
                </span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-950" />
              </div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Crewline Workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close student sidebar"
            className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#1C2940] dark:hover:text-slate-200 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Active internship shortcut */}
        {isInternshipWorkspace && (
          <div className="mx-3 mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
            <p className="text-[11px] font-bold text-[#1769D2] dark:text-blue-300">Active Internship Workspace</p>
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="focus-ring mt-1.5 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-slate-700 hover:text-[#1769D2] dark:text-slate-300 dark:hover:text-blue-300"
            >
              <ArrowLeft size={13} /> Back to My Account
            </Link>
          </div>
        )}

        {/* Navigation list */}
        <nav aria-label="Student Navigation" className="p-3">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            My Workspace
          </p>
          <ul className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === "/account" && !item.hash && !isInternshipWorkspace;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#EAF3FF] text-[#1769D2] shadow-xs dark:bg-blue-950/60 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-[#1769D2] dark:text-blue-300" : "text-slate-400 dark:text-slate-500"}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Explore & Verify
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/internships"
                onClick={() => setMobileOpen(false)}
                className="focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
              >
                <Compass size={17} className="text-slate-400 dark:text-slate-500" />
                <span>Browse Internships</span>
              </Link>
            </li>
            <li>
              <Link
                href="/verify"
                onClick={() => setMobileOpen(false)}
                className="focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
              >
                <ShieldCheck size={17} className="text-slate-400 dark:text-slate-500" />
                <span>Verify Certificate</span>
              </Link>
            </li>
            <li>
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="focus-ring flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
              >
                <Home size={17} className="text-slate-400 dark:text-slate-500" />
                <span>Home Page</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Student Profile & Sign Out Footer */}
      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-[#1C2940]">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-xs font-bold text-[#101D35] dark:text-[#F1F5FB]">
                {studentName || "Student Account"}
              </p>
              <p className="truncate text-[10px] text-slate-500 dark:text-[#A8B5C8]">
                {studentEmail || "Enrolled Intern"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
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
            <GraduationCap size={16} />
          </span>
          <span className="truncate text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Student /{" "}
            <strong className="text-[#101D35] dark:text-[#F1F5FB]">
              {isInternshipWorkspace ? "Internship Workspace" : "My Account"}
            </strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle student navigation sidebar"
          aria-expanded={mobileOpen}
          className="focus-ring flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB]"
        >
          {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          <span>{mobileOpen ? "Close" : "Student Menu"}</span>
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
