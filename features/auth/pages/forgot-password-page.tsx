import { isMailConfigured } from "@/lib/mail";
import { connection } from "next/server";
import { PasswordForm } from "@/features/auth/components/password-form";
export default async function ForgotPasswordPage() {
  await connection();
  return <PasswordForm mode="forgot" mailEnabled={isMailConfigured()} />;
}
