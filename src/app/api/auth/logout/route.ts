import { redirect } from "next/navigation";
import { clearSession } from "@/server/auth/session";

export async function POST() {
  await clearSession();
  redirect("/login");
}
