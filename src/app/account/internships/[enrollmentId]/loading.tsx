export default function InternshipWorkspaceLoading() {
  return (
    <main className="min-h-[70vh] bg-cloud px-4 py-8 sm:px-8 sm:py-12 dark:bg-[#0B1220]">
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#151F32]">
          <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-8 w-72 max-w-full rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-72 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-[#151F32]" />
          <div className="h-72 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#151F32]" />
        </div>
      </div>
    </main>
  );
}
