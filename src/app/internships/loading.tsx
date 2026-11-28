export default function InternshipsLoading() {
  return (
    <main className="min-h-[70vh] bg-cloud px-5 py-10 sm:px-8 sm:py-14 dark:bg-[#0B1220]">
      <div className="mx-auto max-w-7xl space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-9 w-80 max-w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]">
              <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-16 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-6 h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
