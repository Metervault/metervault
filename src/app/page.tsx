import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  redirect(user.orgRole === "admin" ? "/office" : "/field");
}
