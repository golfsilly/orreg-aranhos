import { getAuthorizedUser } from "@/lib/authorization";
import { recordDenied } from "@/lib/audit/denied";
import { prisma } from "@/lib/prisma";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
type Context = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const actor = await getAuthorizedUser("users:manage");
  if (!actor) {
    await recordDenied("USERS_READ");
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }
  const { userId } = await params;
  if (!userId || userId.length > 191) return Response.json({ error: "Not found" }, { status: 404, headers });
  const asset = await prisma.userProfileAssets.findUnique({ where: { userId }, select: { avatar: true } });
  if (!asset?.avatar) return new Response(null, { status: 404, headers });
  return new Response(new Uint8Array(asset.avatar), { headers: { ...headers, "Content-Type": "image/webp" } });
}
