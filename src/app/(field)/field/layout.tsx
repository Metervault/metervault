import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { FieldShell } from "@/components/field/field-shell";
import { BRAND } from "@/lib/brand";
import { safeDbMessage } from "@/server/db/client";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Field",
  applicationName: BRAND.fieldAppName,
  description: BRAND.fieldDescription,
};

export default async function FieldLayout({ children }: { children: ReactNode }) {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    unstable_rethrow(error);
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-bold">{BRAND.name}</h1>
        <p className="mt-3 text-sm text-danger">{safeDbMessage(error)}</p>
      </main>
    );
  }
  if (!user) redirect("/login?next=/field");
  return <FieldShell user={{ name: user.name, username: user.username, email: user.email }}>{children}</FieldShell>;
}
