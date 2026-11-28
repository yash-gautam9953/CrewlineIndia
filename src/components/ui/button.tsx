import { type ButtonHTMLAttributes, forwardRef } from "react";
import { LoaderCircle } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1769D2] text-white border border-transparent shadow-xs hover:bg-[#123B70] active:bg-[#0F2F5C] [&_svg]:text-white dark:bg-[#1769D2] dark:text-white dark:hover:bg-[#2575E6]",
  secondary:
    "bg-[#EAF3FF] text-[#123B70] border border-blue-200/80 hover:bg-[#D8EAFF] active:bg-[#C6E0FF] [&_svg]:text-[#1769D2] dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800/60 dark:hover:bg-blue-950 [&_svg]:dark:text-blue-300",
  outline:
    "bg-white text-[#101D35] border border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-[#151F32] dark:text-[#F1F5FB] dark:border-slate-700 dark:hover:bg-[#1C2940]",
  destructive:
    "bg-rose-600 text-white border border-transparent shadow-xs hover:bg-rose-700 active:bg-rose-800 [&_svg]:text-white dark:bg-rose-600 dark:hover:bg-rose-500",
  ghost:
    "bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-[#101D35] dark:text-[#A8B5C8] dark:hover:bg-[#1C2940] dark:hover:text-[#F1F5FB]",
  success:
    "bg-emerald-700 text-white border border-transparent shadow-xs hover:bg-emerald-800 active:bg-emerald-900 [&_svg]:text-white dark:bg-emerald-600 dark:hover:bg-emerald-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 py-1.5 text-xs rounded-lg gap-1.5",
  md: "min-h-11 px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "min-h-12 px-6 py-3 text-sm rounded-xl gap-2",
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return [
    "focus-ring inline-flex items-center justify-center font-semibold transition-colors select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth = false, loading = false, disabled, className = "", type = "button", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonVariants({ variant, size, fullWidth, className })}
      {...props}
    >
      {loading && <LoaderCircle size={size === "sm" ? 14 : 16} className="shrink-0 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
