"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Map, Plus, SunMedium, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { BRAND, STORAGE } from "@/lib/brand";
import { writeTechProfile } from "@/lib/field/profile";
import { SyncPill } from "@/components/field/sync-pill";
import { SyncProvider, useSyncStatus } from "@/components/field/sync-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const tabs = [
  { href: "/field", label: "Jobs", icon: ClipboardList },
  { href: "/field/capture", label: "Capture", icon: Plus },
  { href: "/field/map", label: "Map", icon: Map },
  { href: "/field/account", label: "Account", icon: UserRound },
];

export function FieldShell({ children, user }: { children: ReactNode; user: { name: string; username: string; email: string } }) {
  return (
    <SyncProvider>
      <FieldFrame user={user}>{children}</FieldFrame>
    </SyncProvider>
  );
}

function FieldFrame({ children, user }: { children: ReactNode; user: { name: string; username: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, offline } = useSyncStatus();
  const [sunlight, setSunlight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE.sunlight) === "on";
    setSunlight(stored);
    writeTechProfile({ name: user.name, username: user.username });
    for (const tab of tabs) router.prefetch(tab.href);
  }, [router, user.name, user.username]);

  function toggleSunlight() {
    const next = !sunlight;
    setSunlight(next);
    localStorage.setItem(STORAGE.sunlight, next ? "on" : "off");
  }

  return (
    <div data-sunlight={sunlight ? "on" : "off"} className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-canvas">
        <header className="sticky top-0 z-20 border-b border-line bg-surface pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between gap-3 px-4">
            <Link href="/field" className="inline-flex min-h-14 min-w-0 items-center gap-2" aria-label={`${BRAND.name} jobs`}>
              <LogoMark className="h-9 w-9 shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold leading-tight tracking-tight text-ink">
                  Meter<span className="text-brand">Vault</span>
                </span>
                <span className="block text-xs font-semibold text-muted">Field capture</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={toggleSunlight}
                aria-pressed={sunlight}
                aria-label={sunlight ? "Turn sunlight mode off" : "Turn sunlight mode on"}
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-md text-ink hover:bg-canvas"
              >
                <SunMedium size={20} />
              </button>
              <ThemeToggle />
            </div>
          </div>
          <div className="px-4 pb-2">
            <SyncPill state={offline && state !== "failed" && state !== "synced" ? "local" : state} />
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-5">{children}</main>
        <nav
          className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-lg -translate-x-1/2 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
          aria-label="Field"
        >
          {tabs.map((tab) => {
            const active = tab.href === "/field/capture" ? pathname.startsWith("/field/capture") : pathname === tab.href;
            const Icon = tab.icon;
            const capture = tab.href === "/field/capture";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <span
                  className={
                    capture
                      ? "inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm"
                      : "inline-flex h-8 w-8 items-center justify-center"
                  }
                >
                  <Icon size={capture ? 22 : 20} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
