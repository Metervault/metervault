"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { STORAGE } from "@/lib/brand";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.getAttribute("data-theme") === "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem(STORAGE.theme, "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem(STORAGE.theme, "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex min-h-12 min-w-12 items-center justify-center rounded-md hover:bg-canvas ${className || "text-ink"}`}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
