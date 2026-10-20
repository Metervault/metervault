"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Map,
  Package,
  PanelLeft,
  ShieldCheck,
  Users,
  Waypoints,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoLockup, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND, STORAGE } from "@/lib/brand";

const nav = [
  { href: "/office", label: "Home", icon: LayoutDashboard, key: "G H" },
  { href: "/office/review", label: "Review", icon: ShieldCheck, key: "G R" },
  { href: "/office/jobs", label: "Jobs", icon: ListChecks, key: "G J" },
  { href: "/office/team", label: "Team", icon: Users, key: "G T" },
  { href: "/office/work-orders", label: "Work orders", icon: Waypoints, key: "G W" },
  { href: "/office/stock", label: "Stock", icon: Package, key: "G S" },
  { href: "/office/exports", label: "Exports", icon: FileSpreadsheet, key: "G E" },
  { href: "/office/map", label: "Map", icon: Map, key: "G M" },
];

const go = {
  h: "/office",
  d: "/office",
  r: "/office/review",
  j: "/office/jobs",
  t: "/office/team",
  w: "/office/work-orders",
  s: "/office/stock",
  e: "/office/exports",
  m: "/office/map",
} as const;

export function OfficeShell({ children, user }: { children: ReactNode; user: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [help, setHelp] = useState(false);
  const pendingG = useRef(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "?") {
        setHelp((open) => !open);
        return;
      }
      if (event.key === "[") {
        setCollapsed((value) => !value);
        return;
      }
      if (event.key === "d" || event.key === "D") {
        if (pendingG.current) {
          pendingG.current = false;
          router.push(go.d);
          return;
        }
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        if (dark) {
          document.documentElement.removeAttribute("data-theme");
          localStorage.setItem(STORAGE.theme, "light");
        } else {
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem(STORAGE.theme, "dark");
        }
        return;
      }
      if (event.key === "g" || event.key === "G") {
        pendingG.current = true;
        window.setTimeout(() => {
          pendingG.current = false;
        }, 800);
        return;
      }
      const next = go[event.key.toLowerCase() as keyof typeof go];
      if (pendingG.current && next) {
        pendingG.current = false;
        router.push(next);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-sidebar lg:flex ${
          collapsed ? "w-16" : "w-[248px]"
        }`}
      >
        <div className="flex h-[70px] items-center border-b border-line px-4">
          {collapsed ? <LogoMark className="h-8 w-8" label={BRAND.name} /> : <LogoLockup />}
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Manager">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium ${
                  active ? "bg-primary/15 text-brand" : "text-ink hover:bg-canvas"
                }`}
              >
                <Icon size={18} />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3 text-xs text-muted">
          {collapsed ? BRAND.mark : `${BRAND.name} · ${BRAND.location}`}
        </div>
      </aside>
      <div className={collapsed ? "lg:pl-16" : "lg:pl-[248px]"}>
        <header className="sticky top-0 z-20 bg-primary pt-[env(safe-area-inset-top)] text-on-primary">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setCollapsed((value) => !value)}
                className="hidden h-12 w-12 items-center justify-center rounded-md text-on-primary hover:bg-white/10 lg:inline-flex"
                aria-label="Collapse sidebar"
              >
                <PanelLeft size={18} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Manager dashboard</p>
                <p className="truncate text-base font-bold">{user.name}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle className="text-on-primary hover:bg-white/10" />
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="inline-flex h-12 items-center rounded-md px-3 text-sm font-semibold text-on-primary hover:bg-white/10">
                  Log out
                </button>
              </form>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Manager sections">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${active ? "bg-white text-primary" : "bg-white/15 text-white"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-5 lg:px-6 lg:py-6">{children}</main>
        <footer className="hidden items-center justify-between px-6 pb-6 text-xs text-muted lg:flex">
          <span>Shortcuts</span>
          <span>
            <kbd className="rounded-sm border border-line bg-surface px-1.5 py-0.5">?</kbd> help
            <span className="px-2">·</span>
            <kbd className="rounded-sm border border-line bg-surface px-1.5 py-0.5">[</kbd> sidebar
            <span className="px-2">·</span>
            <kbd className="rounded-sm border border-line bg-surface px-1.5 py-0.5">D</kbd> theme
          </span>
        </footer>
      </div>
      {help ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6" role="presentation" onClick={() => setHelp(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-title"
            className="w-full max-w-md rounded-lg bg-surface p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="shortcut-title" className="section-title mb-4 text-xl">
              Keyboard shortcuts
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {nav.map((item) => (
                <li key={item.href} className="flex justify-between gap-4">
                  <span>{item.label}</span>
                  <span className="font-semibold text-brand">{item.key}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4">
                <span>Theme</span>
                <span className="font-semibold text-brand">D</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Sidebar</span>
                <span className="font-semibold text-brand">[</span>
              </li>
            </ul>
            <button type="button" className="mt-6 min-h-12 rounded-md bg-primary px-4 font-semibold text-on-primary" onClick={() => setHelp(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
