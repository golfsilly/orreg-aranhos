import { SignInForm } from "@/features/auth/components/signin-form";
import { redirectAuthenticatedUser } from "@/features/auth/server/redirect-authenticated-user";
import { providerIdConfigured } from "@/lib/provider-id";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await redirectAuthenticatedUser();
  const { error } = await searchParams;
  return (
    <SignInForm
      providerEnabled={providerIdConfigured()}
      providerError={Boolean(error)}
    />
  );
}
