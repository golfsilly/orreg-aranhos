import "server-only";
import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";

/** Use the same active-account and permission check as the workspace. */
export async function redirectAuthenticatedUser() {
  if (await getAuthorizedUser("dashboard:read")) redirect("/dashboard");
}
