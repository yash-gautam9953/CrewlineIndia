"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

export function CertificateSearch() {
  const [certificateId, setCertificateId] = useState("");
  const router = useRouter();
  return <form className="mt-7 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); const id = certificateId.trim(); if (id) router.push(`/verify/${encodeURIComponent(id)}`); }}>
    <label className="sr-only" htmlFor="certificate-id">Certificate ID</label>
    <input id="certificate-id" value={certificateId} onChange={(event) => setCertificateId(event.target.value)} required maxLength={80} placeholder="Enter certificate ID" className="focus-ring min-h-14 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-navy placeholder:text-slate-400" />
    <button className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white hover:bg-blue-600" type="submit"><Search size={17} /> Verify <ArrowRight size={16} /></button>
  </form>;
}
