"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/internships", label: "Internships" },
  { href: "/about", label: "About" },
  { href: "/verify", label: "Verify Certificate" },
];

export function SiteHeader({ loggedIn, admin }: { loggedIn: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-[#0B1220]/95">
      <div className="mx-auto grid h-[72px] max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-8 md:h-[88px]">
        <Link
          href="/"
          aria-label="Crewline home"
          className="focus-ring flex items-center rounded-xl dark:bg-white/95 dark:px-2.5 dark:py-1"
        >
          <Image
            src="/brand-logo.png"
            alt="Crewline"
            width={320}
            height={107}
            priority
            className="h-9 w-auto object-contain sm:h-11 md:h-12"
          />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center justify-center gap-7 md:flex">
          {links.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`focus-ring rounded-lg px-2 py-1 text-sm transition-colors lg:text-base ${
                  isActive
                    ? "font-bold text-[#1769D2] dark:text-blue-400"
                    : "font-semibold text-slate-600 hover:text-[#1769D2] dark:text-[#A8B5C8] dark:hover:text-[#F1F5FB]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center justify-end gap-3 md:flex">
          <ThemeToggle />
          {loggedIn ? (
            <>
              <Link
                href={admin ? "/admin" : "/account"}
                className={buttonVariants({ variant: "primary", size: "md", className: "rounded-full px-5" })}
              >
                {admin ? "Admin panel" : "My account"}
              </Link>
              <button
                type="button"
                disabled={signingOut}
                onClick={signOut}
                className={buttonVariants({ variant: "ghost", size: "md", className: "rounded-full" })}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "md", className: "rounded-full" })}
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={buttonVariants({
                  variant: "primary",
                  size: "md",
                  className: "rounded-full px-5 shadow-md shadow-blue-500/20",
                })}
              >
                Get started <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center justify-end gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#101D35] hover:bg-slate-50 dark:border-slate-700 dark:bg-[#151F32] dark:text-[#F1F5FB] dark:hover:bg-[#1C2940]"
          >
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {open && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-200/80 bg-white px-5 py-5 dark:border-slate-800 dark:bg-[#151F32] md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1.5">
            {links.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  onClick={() => setOpen(false)}
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`focus-ring rounded-xl px-3.5 py-3 text-base font-semibold transition-colors ${
                    isActive
                      ? "bg-[#EAF3FF] font-bold text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-300"
                      : "text-slate-700 hover:bg-[#F7F9FC] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
              {loggedIn ? (
                <>
                  <Link
                    onClick={() => setOpen(false)}
                    href={admin ? "/admin" : "/account"}
                    className={buttonVariants({ variant: "primary", size: "md", className: "rounded-full" })}
                  >
                    {admin ? "Admin panel" : "My account"}
                  </Link>
                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={() => {
                      setOpen(false);
                      void signOut();
                    }}
                    className={buttonVariants({ variant: "outline", size: "md", className: "rounded-full" })}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    onClick={() => setOpen(false)}
                    href="/login"
                    className={buttonVariants({ variant: "outline", size: "md", className: "rounded-full" })}
                  >
                    Sign in
                  </Link>
                  <Link
                    onClick={() => setOpen(false)}
                    href="/register"
                    className={buttonVariants({ variant: "primary", size: "md", className: "rounded-full" })}
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
