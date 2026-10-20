import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { FieldShell } from "@/components/field/field-shell";
import { BRAND } from "@/lib/brand";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Field",
  applicationName: BRAND.fieldAppName,
  description: BRAND.fieldDescription,
};

export default async function FieldLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/field");
  return <FieldShell user={{ name: user.name, username: user.username, email: user.email }}>{children}</FieldShell>;
}
