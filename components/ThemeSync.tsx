"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Keeps `<html class="dark">` in sync with the theme setting, and follows the
 * OS live while the preference is "system".
 */
export function ThemeSync() {
  const { settings, ready } = useStore();

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
    };

    apply();
    if (settings.theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme, ready]);

  return null;
}
