import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OfficeShell } from "@/components/office/office-shell";
import { BRAND } from "@/lib/brand";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Manager",
  applicationName: BRAND.officeAppName,
  description: BRAND.officeDescription,
};

export default async function OfficeLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office");
  if (user.orgRole !== "admin") redirect("/field");
  return <OfficeShell user={{ name: user.name, email: user.email }}>{children}</OfficeShell>;
}
