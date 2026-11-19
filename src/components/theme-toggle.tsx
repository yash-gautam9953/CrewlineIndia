"use client";

import { useTheme, type Theme } from "@/components/theme-provider";
import { Sun, Moon, Laptop } from "lucide-react";
import { useSyncExternalStore } from "react";

interface ThemeToggleProps {
  variant?: "compact" | "segmented";
  className?: string;
}

function subscribeMounted() {
  return () => {};
}

export function ThemeToggle({ variant = "compact", className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeMounted,
    () => true,
    () => false
  );

  if (!mounted) {
    // Avoid hydration mismatch by rendering a neutral placeholder with matching dimensions
    return (
      <div
        className={`inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100/50 dark:border-slate-800 dark:bg-slate-800/50 ${
          variant === "segmented" ? "h-11 w-full max-w-xs" : "h-9 w-24"
        } ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (variant === "segmented") {
    const options: { value: Theme; label: string; icon: typeof Sun }[] = [
      { value: "light", label: "Light", icon: Sun },
      { value: "system", label: "System", icon: Laptop },
      { value: "dark", label: "Dark", icon: Moon },
    ];

    return (
      <div
        role="group"
        aria-label="Theme selection"
        className={`inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900 ${className}`}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-white text-[#123B70] shadow-sm dark:bg-[#1C2940] dark:text-[#F1F5FB] dark:shadow-md"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={14} className={isActive ? "text-[#1769D2] dark:text-[#2575E6]" : ""} />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact variant for navigation bar
  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`inline-flex items-center gap-0.5 rounded-full border border-slate-200/90 bg-white/90 p-0.5 shadow-sm dark:border-slate-800 dark:bg-[#151F32]/90 ${className}`}
    >
      <button
        type="button"
        title="Light theme"
        aria-label="Light theme"
        onClick={() => setTheme("light")}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          theme === "light"
            ? "bg-[#EAF3FF] text-[#1769D2] shadow-xs dark:bg-blue-950/80 dark:text-blue-300"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <Sun size={14} />
      </button>

      <button
        type="button"
        title="Follow system theme"
        aria-label="Follow system theme"
        onClick={() => setTheme("system")}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          theme === "system"
            ? "bg-[#EAF3FF] text-[#1769D2] shadow-xs dark:bg-blue-950/80 dark:text-blue-300"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <Laptop size={13} />
      </button>

      <button
        type="button"
        title="Dark theme"
        aria-label="Dark theme"
        onClick={() => setTheme("dark")}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          theme === "dark"
            ? "bg-[#1C2940] text-[#F1F5FB] shadow-xs dark:bg-blue-950/80 dark:text-blue-300"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
