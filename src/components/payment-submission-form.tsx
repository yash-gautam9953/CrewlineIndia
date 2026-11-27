"use client";

import { ExternalLink, QrCode } from "lucide-react";

export function PaymentSubmissionForm({
  disabled,
  googleFormUrl = "",
}: {
  paymentId?: string;
  disabled: boolean;
  googleFormUrl?: string;
}) {
  if (disabled) return null;

  return (
    <div className="mt-4">
      {googleFormUrl ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1769D2] text-white">
                <QrCode size={19} />
              </span>
              <div>
                <p className="text-sm font-bold text-[#101D35] dark:text-[#F1F5FB]">Complete Payment via Google Form</p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-[#A8B5C8]">
                  Click the button to open the payment form, scan the UPI QR code, and submit the form. After reviewing your project and payment, Crewline admin will unlock your certificates.
                </p>
              </div>
            </div>
            <a
              href={googleFormUrl}
              target="_blank"
              rel="noreferrer"
              className="admin-btn-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1769D2] px-5 text-sm font-bold text-white shadow-xs transition hover:bg-[#123B70]"
            >
              Pay Now (Open Form) <ExternalLink size={15} className="text-white" />
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Payment form link has not been configured yet by the Crewline admin. Please check back shortly.
        </div>
      )}
    </div>
  );
}
