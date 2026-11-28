"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formInputLgClass } from "@/components/ui/form-controls";

export function CertificateSearch() {
  const [certificateId, setCertificateId] = useState("");
  const router = useRouter();

  return (
    <search>
      <form
        className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch"
        onSubmit={(event) => {
          event.preventDefault();
          const id = certificateId.trim();
          if (id) router.push(`/verify/${encodeURIComponent(id)}`);
        }}
      >
        <label className="sr-only" htmlFor="certificate-id">
          Certificate ID
        </label>
        <input
          id="certificate-id"
          name="certificateId"
          type="search"
          value={certificateId}
          onChange={(event) => setCertificateId(event.target.value)}
          required
          maxLength={80}
          spellCheck={false}
          autoCapitalize="characters"
          placeholder="e.g. CW-26I-XXXXX"
          className={`${formInputLgClass} !mt-0 min-h-12 flex-1`}
        />
        <Button type="submit" variant="primary" size="lg" className="shrink-0 sm:px-7">
          <Search size={17} aria-hidden="true" /> Verify <ArrowRight size={16} aria-hidden="true" />
        </Button>
      </form>
    </search>
  );
}
