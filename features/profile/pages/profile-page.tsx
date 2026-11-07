import { redirect } from "next/navigation";
import { getAuthorizedUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ProfileEditor } from "@/features/profile/components/profile-editor";

export default async function ProfilePage() {
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) redirect("/signin");
  const details = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, username: true, organization: true, mission: true, workGroup: true, jobTitle: true, jobLevel: true, accounts: { where: { providerId: "credential", password: { not: null } }, select: { id: true }, take: 1 }, profileAssets: { select: { avatar: true, signature: true } } } });
  if (!details) redirect("/signin");
  return <ProfileEditor user={{ name: user.name, role: user.role, email: details.email, username: details.username }} work={{ name: user.name, organization: details.organization ?? "", mission: details.mission ?? "", workGroup: details.workGroup ?? "", jobTitle: details.jobTitle ?? "", jobLevel: details.jobLevel ?? "" }} hasCredential={details.accounts.length > 0} initialAvatar={Boolean(details.profileAssets?.avatar)} initialSignature={Boolean(details.profileAssets?.signature)} />;
}
