// app/providers/ThemeProvider.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Theme = "theme-light" | "theme-dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light theme, or read from localStorage if you add persistence later
  const [theme, setTheme] = useState<Theme>("theme-light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "theme-light" ? "theme-dark" : "theme-light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* 
        This wrapper div acts as your theme root. 
        It ensures all legacy CSS selectors (.theme-light .card) cascade properly.
      */}
      <div className={theme} style={{ minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}