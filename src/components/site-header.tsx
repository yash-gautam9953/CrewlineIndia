"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/internships", label: "Internships" },
  { href: "/about", label: "About" },
  { href: "/verify", label: "Verify Certificate" },
];

export function SiteHeader({ loggedIn, admin }: { loggedIn: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl transition-colors duration-200 dark:border-slate-800 dark:bg-[#0B1220]/95">
      <div className="mx-auto grid h-[88px] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Crewline home" className="focus-ring flex items-center rounded-md">
          <Image
            src="/brand-logo.png"
            alt="Crewline"
            width={320}
            height={107}
            priority
            className="h-11 w-auto object-contain sm:h-13"
          />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center justify-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#1769D2] dark:text-slate-300 dark:hover:text-[#2575E6] lg:text-base"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-5 md:flex">
          <ThemeToggle variant="compact" />
          {loggedIn ? (
            <>
              <Link
                href={admin ? "/admin" : "/account"}
                className="text-sm font-semibold text-[#101D35] hover:text-[#1769D2] dark:text-[#F1F5FB] dark:hover:text-[#2575E6] lg:text-base"
              >
                {admin ? "Admin panel" : "My account"}
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="text-sm font-semibold text-slate-500 hover:text-[#101D35] dark:text-slate-400 dark:hover:text-white lg:text-base"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-[#101D35] hover:text-[#1769D2] dark:text-[#F1F5FB] dark:hover:text-[#2575E6] lg:text-base"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="nav-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-md shadow-blue-500/20 transition hover:-translate-y-0.5 lg:px-6 lg:py-3 lg:text-base"
              >
                Get started <ArrowUpRight size={17} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle variant="compact" />
          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="focus-ring rounded-lg p-2 text-[#101D35] hover:bg-slate-100 dark:text-[#F1F5FB] dark:hover:bg-slate-800"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-200/80 bg-white px-5 py-5 transition-colors duration-200 dark:border-slate-800 dark:bg-[#151F32] md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1.5">
            {links.map((link) => (
              <Link
                onClick={() => setOpen(false)}
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-3 text-base font-semibold text-slate-700 hover:bg-[#F7F9FC] dark:text-slate-200 dark:hover:bg-[#1C2940]"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 px-3 pt-3 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Appearance</span>
              <ThemeToggle variant="compact" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {loggedIn ? (
                <>
                  <Link
                    onClick={() => setOpen(false)}
                    href={admin ? "/admin" : "/account"}
                    className="admin-btn-primary rounded-full px-4 py-3 text-center text-sm font-bold text-white shadow-sm"
                  >
                    {admin ? "Admin panel" : "My account"}
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1C2940] dark:text-slate-200"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    onClick={() => setOpen(false)}
                    href="/login"
                    className="rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#1C2940] dark:text-slate-200"
                  >
                    Sign in
                  </Link>
                  <Link
                    onClick={() => setOpen(false)}
                    href="/register"
                    className="nav-cta rounded-full px-4 py-3 text-center text-sm font-bold text-white shadow-sm"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
