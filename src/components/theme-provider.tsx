"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Theme = "light";
export type ResolvedTheme = "light";

type ThemeContextType = {
  theme: "light";
  resolvedTheme: "light";
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: "light", resolvedTheme: "light", setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
