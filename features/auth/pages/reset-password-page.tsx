import { PasswordForm } from "@/features/auth/components/password-form";
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <PasswordForm mode="reset" token={error ? undefined : token} />;
}
