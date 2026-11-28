export default function InternshipDetailLoading() {
  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14 dark:bg-[#0B1220]">
      <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#151F32]">
          <div className="bg-slate-200/70 px-6 py-12 sm:px-12 dark:bg-slate-800">
            <div className="h-5 w-28 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="mt-5 h-10 w-2/3 rounded-lg bg-slate-300 dark:bg-slate-700" />
            <div className="mt-4 h-14 w-1/2 rounded-lg bg-slate-300/70 dark:bg-slate-700/70" />
          </div>
          <div className="grid gap-8 p-6 sm:p-12 md:grid-cols-[1fr_280px]">
            <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </main>
  );
}
