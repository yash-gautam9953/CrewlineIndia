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
  {
    href: "/account",
    label: "Workspace Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/account#internships",
    label: "My Internships",
    icon: Briefcase,
    hash: "#internships",
  },
  {
    href: "/account#documents",
    label: "My Documents",
    icon: Award,
    hash: "#documents",
  },
  {
    href: "/account#profile",
    label: "My Profile",
    icon: UserRound,
    hash: "#profile",
  },
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
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Header / Brand */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#1769D2]">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#101D35]">
                  Student Portal
                </span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-100" />
              </div>
              <p className="text-[11px] font-medium text-slate-400">Crewline Workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close student sidebar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* If inside an internship workspace, show quick back link */}
        {isInternshipWorkspace && (
          <div className="mx-3 mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
            <p className="text-[11px] font-bold text-[#1769D2]">Active Internship Workspace</p>
            <Link
              href="/account"
              onClick={() => setMobileOpen(false)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#1769D2]"
            >
              <ArrowLeft size={13} /> Back to My Account
            </Link>
          </div>
        )}

        {/* Navigation list */}
        <nav aria-label="Student Navigation" className="p-3">
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50 text-[#1769D2] shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#101D35]"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-[#1769D2]" : "text-slate-400"}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-3 border-t border-slate-100" />

          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Explore & Verify
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/internships"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35]"
              >
                <Compass size={17} className="text-slate-400" />
                <span>Browse Internships</span>
              </Link>
            </li>
            <li>
              <Link
                href="/verify"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35]"
              >
                <ShieldCheck size={17} className="text-slate-400" />
                <span>Verify Certificate</span>
              </Link>
            </li>
            <li>
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#101D35]"
              >
                <Home size={17} className="text-slate-400" />
                <span>Home Page</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Student Profile & Sign Out Footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-xs font-bold text-[#101D35]">
                {studentName || "Student Account"}
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {studentEmail || "Enrolled Intern"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-600 hover:shadow-xs transition"
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
      <div className="sticky top-[72px] z-30 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1769D2]">
            <GraduationCap size={16} />
          </span>
          <span className="truncate text-xs font-black uppercase tracking-wider text-slate-400">
            Student / <strong className="text-[#101D35]">{isInternshipWorkspace ? "Internship Workspace" : "My Account"}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle student navigation sidebar"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs"
        >
          {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          <span>{mobileOpen ? "Close" : "Student Menu"}</span>
        </button>
      </div>

      {/* Mobile Off-canvas Drawer Sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer Sheet */}
          <div className="fixed inset-y-0 left-0 z-[61] w-72 max-w-[85vw] overflow-y-auto bg-white shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="sticky top-[88px] hidden h-[calc(100vh-88px)] w-64 shrink-0 overflow-y-auto border-r border-slate-200/80 bg-white md:block xl:w-72">
        {sidebarContent}
      </aside>
    </>
  );
}
