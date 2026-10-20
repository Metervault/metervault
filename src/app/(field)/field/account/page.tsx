import { AccountPanel } from "@/components/field/account-panel";
import { getSessionUser } from "@/server/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/field/account");
  return <AccountPanel user={{ name: user.name, username: user.username, email: user.email, manager: user.orgRole === "admin" }} />;
}
