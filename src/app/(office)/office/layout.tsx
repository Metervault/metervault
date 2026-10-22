import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { OfficeShell } from "@/components/office/office-shell";
import { BRAND } from "@/lib/brand";
import { isOfficeRole } from "@/lib/roles";
import { safeDbMessage } from "@/server/db/client";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Manager",
  applicationName: BRAND.officeAppName,
  description: BRAND.officeDescription,
};

export default async function OfficeLayout({ children }: { children: ReactNode }) {
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
  if (!user) redirect("/login?next=/office");
  if (!isOfficeRole(user.orgRole)) redirect("/field");
  return <OfficeShell user={{ name: user.name, email: user.email }}>{children}</OfficeShell>;
}
