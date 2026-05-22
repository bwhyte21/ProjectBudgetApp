import { useEffect, type ReactNode } from "react";
import { useAppSelector } from "../store/hooks";

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const mode = useAppSelector((s) => s.theme.mode);

  useEffect(() => {
    const root = document.documentElement;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const effective =
        mode === "system" ? (mql.matches ? "dark" : "light") : mode;
      root.classList.toggle("dark", effective === "dark");
    };
    apply();
    if (mode === "system") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [mode]);

  return <>{children}</>;
}
