"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const links = [
  { href: "/internships", label: "Internships" },
  { href: "/about", label: "About" },
  { href: "/verify", label: "Verify certificate" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Crewline home" className="focus-ring rounded-md">
          <Image src="/brand-logo.png" alt="Crewline — Learn. Build. Get Recognized." width={260} height={72} priority className="h-11 w-auto object-contain" />
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-9 md:flex">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-600 transition hover:text-brand">{link.label}</Link>)}
          <Link href="/login" className="text-sm font-semibold text-navy hover:text-brand">Sign in</Link>
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-600">Get started <ArrowUpRight size={16} /></Link>
        </nav>
        <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)} className="focus-ring rounded-lg p-2 text-navy md:hidden">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && <nav aria-label="Mobile navigation" className="border-t border-slate-100 bg-white px-5 py-5 md:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          {links.map((link) => <Link onClick={() => setOpen(false)} key={link.href} href={link.href} className="rounded-xl px-3 py-3 font-medium text-slate-700 hover:bg-cloud">{link.label}</Link>)}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Link onClick={() => setOpen(false)} href="/login" className="rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold">Sign in</Link>
            <Link onClick={() => setOpen(false)} href="/register" className="rounded-full bg-brand px-4 py-3 text-center text-sm font-semibold text-white">Get started</Link>
          </div>
        </div>
      </nav>}
    </header>
  );
}
