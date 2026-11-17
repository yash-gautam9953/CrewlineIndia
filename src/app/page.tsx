import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Award, BookOpenCheck, Braces, Cloud, Code2, Cpu, Database, ShieldCheck, Sparkles } from "lucide-react";
import { getPublishedInternships } from "@/lib/internships";
import { InternshipCard, InternshipStatus } from "@/components/internship-card";

const domains = [
  { name: "Web development", icon: Code2, color: "blue" },
  { name: "Artificial intelligence", icon: Cpu, color: "purple" },
  { name: "Data science", icon: Database, color: "blue" },
  { name: "Cloud computing", icon: Cloud, color: "purple" },
  { name: "Cybersecurity", icon: ShieldCheck, color: "blue" },
  { name: "Programming", icon: Braces, color: "purple" },
];

export default async function Home() {
  const result = await getPublishedInternships(3);
  return (
    <main>
      <section className="hero-glow surface-grid relative overflow-hidden border-b border-slate-100">
        <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:py-28">
          <div className="fade-in relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-blue-700 shadow-sm"><Sparkles size={14} /> Learn by doing</div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.06] tracking-[-.055em] text-navy sm:text-6xl lg:text-[4.4rem]">Build your skills.<br /><span className="bg-gradient-to-r from-brand to-purple bg-clip-text text-transparent">Gain real experience.</span><br />Get recognized.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">Explore technology internships, work on practical projects, develop industry-relevant skills, and earn verifiable certificates with Crewline.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/internships" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-600">Explore internships <ArrowRight size={17} /></Link>
              <Link href="/verify" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 text-sm font-semibold text-navy transition hover:border-slate-300 hover:bg-slate-50">Verify a certificate <ArrowUpRight size={17} /></Link>
            </div>
            <div className="mt-11 flex items-center gap-3 text-sm text-slate-500"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-brand"><ShieldCheck size={16} /></span> Real learning. Transparent outcomes. Verifiable credentials.</div>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-100 via-transparent to-purple-100 blur-2xl" />
            <div className="glass-card float relative rounded-[2rem] border border-white p-5 shadow-2xl shadow-slate-300/50 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Your learning path</p><h2 className="mt-1 text-lg font-bold text-navy">From curious to capable</h2></div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-brand"><BookOpenCheck size={22} /></span>
              </div>
              <ol className="space-y-3 py-5">
                {[
                  ["01", "Choose a field", "Find a program that fits your goals", "bg-blue-50 text-brand"],
                  ["02", "Build real projects", "Learn through guided assignments", "bg-purple-50 text-purple"],
                  ["03", "Get recognized", "Earn a credential others can verify", "bg-indigo-50 text-indigo-600"],
                ].map(([step, title, copy, tone]) => <li key={step} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${tone}`}>{step}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-navy">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{copy}</span></span><ArrowRight size={16} className="text-slate-300" /></li>)}
              </ol>
              <div className="flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-300"><Award size={20} /></span><div><p className="text-xs text-slate-300">Your work, recognized</p><p className="mt-0.5 text-sm font-semibold">Verifiable certificates</p></div></div><ArrowUpRight size={19} className="text-blue-300" /></div>
            </div>
          </div>
        </div>
        <a href="#programs" className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-slate-400 lg:flex">Scroll to explore <ArrowDown size={14} /></a>
      </section>

      <section id="programs" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">Start building</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Featured internships</h2><p className="mt-3 max-w-xl leading-7 text-slate-600">Find a program where you can learn the fundamentals and put them into practice.</p></div>
          <Link href="/internships" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-blue-700">Browse all programs <ArrowRight size={16} /></Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {result.internships.map((internship) => <InternshipCard key={internship.id} internship={internship} />)}
        </div>
        {result.internships.length === 0 && <InternshipStatus status={result.status} />}
      </section>

      <section className="bg-cloud py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-purple">Explore your direction</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Build skills for the work ahead</h2><p className="mt-4 leading-7 text-slate-600">Choose a technology area to explore. Program availability and details are published in Crewline.</p></div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map(({ name, icon: Icon, color }) => <Link href={`/internships?domain=${encodeURIComponent(name)}`} key={name} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"><span className="flex items-center gap-4"><span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color === "blue" ? "bg-blue-50 text-brand" : "bg-purple-50 text-purple"}`}><Icon size={22} /></span><span className="font-semibold text-navy">{name}</span></span><ArrowUpRight size={18} className="text-slate-300 transition group-hover:text-brand" /></Link>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-brand">How Crewline works</p><h2 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Learning that leads somewhere</h2><p className="mt-4 leading-7 text-slate-600">A clear path from choosing what to learn to demonstrating what you can do.</p><Link href="/about" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-brand">More about Crewline <ArrowRight size={16} /></Link></div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[["01", "Explore", "Compare internship programs and choose your next skill area."], ["02", "Practice", "Work through practical tasks and submit projects for review."], ["03", "Show your work", "Meet program completion requirements and verify your certificate." ]].map(([num, title, copy]) => <li key={num} className="rounded-2xl border border-slate-200 p-6"><span className="text-xs font-bold tracking-[.15em] text-brand">{num}</span><h3 className="mt-6 text-lg font-bold text-navy">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-navy px-7 py-12 text-white sm:px-12 sm:py-16">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-purple/30 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-blue-300">Proof that travels</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Make your learning easy to verify.</h2><p className="mt-4 leading-7 text-slate-300">Crewline certificates include a public verification page, so anyone can confirm their status and program details.</p></div><Link href="/verify" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-4 text-sm font-semibold text-navy transition hover:bg-blue-50">Verify a certificate <ArrowUpRight size={17} /></Link></div>
        </div>
      </section>
    </main>
  );
}
