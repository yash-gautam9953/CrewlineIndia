"use client";

import { forwardRef, type InputHTMLAttributes, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  inputClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className = "", inputClassName = "", id, disabled, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={ref}
        id={inputId}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={`crew-input focus-ring min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-[#101D35] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#1C2940] dark:text-[#F1F5FB] dark:placeholder:text-slate-500 ${inputClassName}`}
        {...props}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={inputId}
        className="focus-ring absolute inset-y-1.5 right-1.5 inline-flex min-w-9 items-center justify-center rounded-lg px-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#123B70] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#A8B5C8] dark:hover:bg-[#151F32] dark:hover:text-[#F1F5FB]"
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
});
