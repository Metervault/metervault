"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/section-title";
import { setSyncPaused, syncPaused } from "@/lib/field/profile";
import { flushOutbox } from "@/lib/field/sync";

export function AccountPanel({ user }: { user: { name: string; username: string; email: string; manager: boolean } }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setPaused(syncPaused());
  }, []);

  return (
    <div className="space-y-4">
      <SectionTitle className="text-xl">Your account</SectionTitle>
      <p className="text-sm text-muted">This is the field capture app. Jobs you submit are stored under your name.</p>
      <dl className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm">
        <div>
          <dt className="text-muted">Name</dt>
          <dd className="text-base font-semibold">{user.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Username</dt>
          <dd className="text-base font-semibold">{user.username}</dd>
        </div>
        <div>
          <dt className="text-muted">Email</dt>
          <dd className="text-base font-semibold">{user.email}</dd>
        </div>
      </dl>
      <button
        type="button"
        aria-pressed={paused}
        className="min-h-12 w-full rounded-md border-2 border-brand text-sm font-semibold text-brand"
        onClick={() => {
          const next = !paused;
          setPaused(next);
          setSyncPaused(next);
          if (!next) void flushOutbox();
        }}
      >
        {paused ? "Sync is paused" : "Pause sync"}
      </button>
      <p className="text-sm text-muted">New jobs fill the installer with {user.name}.</p>
      {user.manager ? (
        <Link href="/office" className="flex min-h-12 w-full items-center justify-center rounded-md border border-line text-base font-semibold">
          Manager dashboard
        </Link>
      ) : null}
      <form action="/api/auth/logout" method="post">
        <button type="submit" className="min-h-12 w-full rounded-md bg-primary text-base font-semibold text-on-primary">
          Log out
        </button>
      </form>
    </div>
  );
}
