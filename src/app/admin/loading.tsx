export default function AdminLoading() {
  return (
    <main className="min-h-[70vh] bg-cloud px-4 py-8 sm:px-8 sm:py-12 dark:bg-[#0B1220]">
      <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#151F32]">
              <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-7 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]" />
          ))}
        </div>
      </div>
    </main>
  );
}
