export default function AccountLoading() {
  return (
    <main className="min-h-[70vh] bg-cloud px-4 py-8 sm:px-8 sm:py-12 dark:bg-[#0B1220]">
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#151F32]">
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="mt-5 h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
