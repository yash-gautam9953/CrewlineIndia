"use client";

import { useEffect, useState } from "react";
import { Award, ClipboardList, UsersRound } from "lucide-react";
import type { PublicStats } from "@/lib/public-stats";

const metrics = [
  { key: "students", label: "Student accounts", note: "Registered with Crewline", icon: UsersRound, accent: "from-blue-500 to-cyan-400" },
  { key: "applications", label: "Applications", note: "Submitted through the portal", icon: ClipboardList, accent: "from-violet-500 to-fuchsia-400" },
  { key: "certificates", label: "Certificates issued", note: "Recorded in Crewline", icon: Award, accent: "from-amber-400 to-orange-400" },
] as const;

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || value === 0) {
      const frame = requestAnimationFrame(() => setCount(value));
      return () => cancelAnimationFrame(frame);
    }

    const duration = 2000;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{new Intl.NumberFormat("en-IN").format(count)}</>;
}

export function LiveStats({ stats }: { stats: PublicStats | null }) {
  if (!stats) return null;
  const available = metrics.filter((metric) => stats[metric.key] !== null);
  if (available.length === 0) return null;

  return (
    <section aria-label="Crewline platform statistics" className="relative overflow-hidden border-y border-white/10 bg-[#0b1730] py-16 text-white sm:py-20">
      <div className="stats-orb stats-orb-one" aria-hidden="true" />
      <div className="stats-orb stats-orb-two" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">Crewline, in real numbers</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-.04em] sm:text-4xl">Progress that comes from real people.</h2></div>
          <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-300"><span className="live-dot" aria-hidden="true" /> Current totals from Crewline records</p>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-3">
          {available.map((metric) => {
            const Icon = metric.icon;
            const value = stats[metric.key] ?? 0;
            return <article key={metric.key} className="stat-card group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.055] p-6 backdrop-blur-sm sm:p-7">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${metric.accent}`} />
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-300">{metric.label}</span><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"><Icon size={19} /></span></div>
              <p className="mt-6 text-5xl font-black tracking-[-.06em] tabular-nums sm:text-6xl"><CountUp value={value} /></p>
              <p className="mt-2 text-xs text-slate-400">{metric.note}</p>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}
