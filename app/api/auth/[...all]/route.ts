import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { isMailConfigured } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { writeAudit, type AuditEvent } from "@/lib/audit/write";

const handler = toNextJsHandler(auth);
const securityActions = {
  "/revoke-session": "REVOKE_SESSION", "/revoke-sessions": "REVOKE_SESSIONS", "/revoke-other-sessions": "REVOKE_OTHER_SESSIONS", "/link-social": "LINK_ACCOUNT", "/unlink-account": "UNLINK_ACCOUNT", "/delete-user": "DELETE_ACCOUNT", "/set-password": "SET_PASSWORD",
} as const;
export async function GET(request: Request) {
  const response = await handler.GET(request);
  if (new URL(request.url).pathname.endsWith("/callback/moph-provider-id")) {
    const location = response.headers.get("location");
    const failedRedirect = location ? new URL(location, request.url).searchParams.has("error") : false;
    if (response.status >= 400 || failedRedirect) await writeAudit(prisma, { event: "AUTH_LOGIN_FAILED", outcome: "FAILURE", metadata: { channel: "PROVIDER_ID" } });
  }
  return response;
}
export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  const resetRequest = path.endsWith("/request-password-reset");
  if (resetRequest && !isMailConfigured()) {
    await writeAudit(prisma, { event: "AUTH_PASSWORD_RESET_REQUESTED", outcome: "FAILURE", metadata: { channel: "EMAIL" } });
    return Response.json({ error: "Email is not configured" }, { status: 503 });
  }
  const securityAction = Object.entries(securityActions).find(([suffix]) => path.endsWith(suffix))?.[1];
  const loggedInAction = path.endsWith("/sign-out") || path.endsWith("/change-password") || path.endsWith("/update-user") || path.endsWith("/change-email") || Boolean(securityAction);
  const session = loggedInAction ? await auth.api.getSession({ headers: request.headers }) : null;
  const response = await handler.POST(request);
  const actorId = session?.user.id;
  const outcome = response.ok ? "SUCCESS" : response.status === 401 || response.status === 403 ? "DENIED" : "FAILURE";
  if ((path.endsWith("/sign-in/email") || path.endsWith("/sign-in/username")) && !response.ok) {
    await writeAudit(prisma, { event: "AUTH_LOGIN_FAILED", outcome: "FAILURE", metadata: { channel: path.endsWith("/username") ? "USERNAME" : "EMAIL" } });
  }
  if (resetRequest) await writeAudit(prisma, { event: "AUTH_PASSWORD_RESET_REQUESTED", outcome, metadata: { channel: "EMAIL" } });
  if (path.endsWith("/reset-password") && !response.ok) await writeAudit(prisma, { event: "AUTH_PASSWORD_RESET", outcome: "FAILURE", metadata: { channel: "EMAIL" } });
  if (loggedInAction) {
    const event: AuditEvent = path.endsWith("/sign-out") ? "AUTH_LOGOUT" : path.endsWith("/change-password") ? "AUTH_PASSWORD_CHANGE" : securityAction ? "AUTH_SECURITY_ACTION" : "AUTH_PROFILE_CHANGE";
    await writeAudit(prisma, { actorId, event, outcome, ...(actorId ? { targetType: "USER" as const, targetId: actorId } : {}), ...(securityAction ? { metadata: { action: securityAction } } : {}) });
  }
  return response;
}
