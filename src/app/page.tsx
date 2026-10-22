import { redirect, unstable_rethrow } from "next/navigation";
import { isOfficeRole } from "@/lib/roles";
import { safeDbMessage } from "@/server/db/client";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  let user;
  try {
    user = await getSessionUser();
  } catch (error) {
    unstable_rethrow(error);
    return <main className="mx-auto max-w-lg px-6 py-16 text-sm text-danger">{safeDbMessage(error)}</main>;
  }
  if (!user) redirect("/login");
  redirect(isOfficeRole(user.orgRole) ? "/office" : "/field");
}
