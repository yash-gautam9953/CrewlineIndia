"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { href: "/internships", label: "Internships" },
  { href: "/about", label: "About" },
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto grid h-[88px] max-w-7xl grid-cols-[1fr_auto] items-center px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
        <Link href="/" aria-label="Crewline home" className="focus-ring rounded-md">
          <Image src="/brand-logo.png" alt="Crewline" width={320} height={107} priority className="h-12 w-auto object-contain sm:h-14" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center justify-center gap-10 lg:flex">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-base font-semibold text-slate-600 transition-colors hover:text-brand">{link.label}</Link>)}
        </nav>

        <div className="hidden items-center justify-end gap-7 lg:flex">
          {loggedIn ? <>
            <Link href={admin ? "/admin" : "/account"} className="text-base font-semibold text-navy hover:text-brand">{admin ? "Admin panel" : "My account"}</Link>
            <button type="button" onClick={signOut} className="text-base font-semibold text-slate-500 hover:text-navy">Sign out</button>
          </> : <>
            <Link href="/login" className="text-base font-semibold text-navy hover:text-brand">Sign in</Link>
            <Link href="/register" className="nav-cta inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-bold shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5">Get started <ArrowUpRight size={18} /></Link>
          </>}
        </div>

        <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)} className="focus-ring justify-self-end rounded-lg p-2 text-navy lg:hidden">
          {open ? <X size={25} /> : <Menu size={25} />}
        </button>
      </div>

      {open && <nav aria-label="Mobile navigation" className="border-t border-slate-100 bg-white px-5 py-5 lg:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          {links.map((link) => <Link onClick={() => setOpen(false)} key={link.href} href={link.href} className="rounded-xl px-3 py-3 text-base font-semibold text-slate-700 hover:bg-cloud">{link.label}</Link>)}
          <div className="mt-2 grid grid-cols-2 gap-3">
            {loggedIn ? <>
              <Link onClick={() => setOpen(false)} href={admin ? "/admin" : "/account"} className="rounded-full bg-brand px-4 py-3 text-center text-sm font-bold text-white">{admin ? "Admin panel" : "My account"}</Link>
              <button onClick={() => { setOpen(false); void signOut(); }} className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Sign out</button>
            </> : <>
              <Link onClick={() => setOpen(false)} href="/login" className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Sign in</Link>
              <Link onClick={() => setOpen(false)} href="/register" className="nav-cta rounded-full px-4 py-3 text-center text-sm font-bold">Get started</Link>
            </>}
          </div>
        </div>
      </nav>}
    </header>
  );
}
