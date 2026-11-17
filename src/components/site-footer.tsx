import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr] md:py-20">
        <div>
          <Link href="/" aria-label="Crewline home"><Image src="/brand-logo.png" alt="Crewline" width={260} height={72} className="h-12 w-auto brightness-0 invert" /></Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Explore internship programs, apply online, and manage your application from your student account.</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[.22em] text-blue-300">Learn. Build. Get Recognized.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><Link className="hover:text-white" href="/internships">Internships</Link></li>
            <li><Link className="hover:text-white" href="/about">About Crewline</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Information</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li><Link className="hover:text-white" href="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms and conditions</Link></li>
            <li><Link className="hover:text-white" href="/contact">Contact Crewline</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-400 sm:px-8 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Crewline. All rights reserved.</span>
          <span>Independent learning and internship programs.</span>
        </div>
      </div>
    </footer>
  );
}
