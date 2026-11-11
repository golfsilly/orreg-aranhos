import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { writeAudit } from "@/lib/audit/write";
import { prisma } from "@/lib/prisma";
import { normalizeProfileImage, readLimitedBody, type ProfileAssetKind } from "@/lib/profile/image";
import { hasTrustedRequestOrigin } from "@/lib/security/request-origin";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
type Context = { params: Promise<{ kind: string }> };
function parseKind(value: string): ProfileAssetKind | null { return value === "avatar" || value === "signature" ? value : null; }

export async function GET(_request: Request, context: Context) {
  const kind = parseKind((await context.params).kind);
  if (!kind) return Response.json({ error: "Not found" }, { status: 404, headers });
  const user = await getAuthorizedUser("dashboard:read");
  if (!user) {
    if (kind === "signature") await recordDenied("PROFILE_SIGNATURE_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const assets = await prisma.userProfileAssets.findUnique({ where: { userId: user.id }, select: { [kind]: true } });
  const image = assets?.[kind];
  if (!image) return new Response(null, { status: 404, headers });
  if (kind === "signature") await writeAudit(prisma, { actorId: user.id, event: "PROFILE_SIGNATURE_READ", outcome: "SUCCESS", targetType: "USER", targetId: user.id });
  return new Response(new Uint8Array(image), { headers: { ...headers, "Content-Type": kind === "avatar" ? "image/webp" : "image/png" } });
}

async function mutate(request: Request, context: Context, remove: boolean) {
  const kind = parseKind((await context.params).kind);
  if (!kind) return Response.json({ error: "Not found" }, { status: 404, headers });
  const user = await getAuthorizedUser("dashboard:read");
  if (!user || !hasTrustedRequestOrigin(request)) {
    await recordDenied("PROFILE_ASSET_UPDATED", user?.id);
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  let image: Buffer | null = null;
  if (!remove) {
    try { image = await normalizeProfileImage(await readLimitedBody(request), kind); }
    catch {
      await writeAudit(prisma, { actorId: user.id, event: "PROFILE_ASSET_UPDATED", outcome: "FAILURE", targetType: "USER", targetId: user.id, metadata: { reason: "INVALID_INPUT" } });
      return Response.json({ error: "Invalid image" }, { status: 400, headers });
    }
  }
  const updated = await prisma.$transaction(async (tx) => {
    // Serialize with account administration so a concurrently deactivated
    // account cannot change its signature after deactivation.
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id }, select: { isActive: true } });
    if (!current?.isActive) return false;
    await tx.userProfileAssets.upsert({ where: { userId: user.id }, create: { userId: user.id, [kind]: image }, update: { [kind]: image } });
    await writeAudit(tx, { actorId: user.id, event: "PROFILE_ASSET_UPDATED", outcome: "SUCCESS", targetType: "USER", targetId: user.id, metadata: { avatarChanged: kind === "avatar", signatureChanged: kind === "signature" } });
    return true;
  });
  if (!updated) { await recordDenied("PROFILE_ASSET_UPDATED", user.id); return Response.json({ error: "Forbidden" }, { status: 403, headers }); }
  return new Response(null, { status: 204, headers });
}
export async function PUT(request: Request, context: Context) { return mutate(request, context, false); }
export async function DELETE(request: Request, context: Context) { return mutate(request, context, true); }
