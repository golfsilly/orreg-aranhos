import "server-only";
import { randomUUID } from "node:crypto";
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit/write";

export const PROVIDER_ID = "moph-provider-id";

export function providerIdConfigured() {
  return [env.MOPH_HEALTH_ID_BASE_URL, env.MOPH_HEALTH_ID_CLIENT_ID, env.MOPH_HEALTH_ID_CLIENT_SECRET, env.MOPH_PROVIDER_ID_BASE_URL, env.MOPH_PROVIDER_ID_CLIENT_ID, env.MOPH_PROVIDER_ID_CLIENT_SECRET].every(Boolean);
}

function serviceUrl(base: string, path: string) {
  const url = new URL(path, base);
  if (url.protocol !== "https:") throw new Error("Provider ID requires HTTPS");
  return url.toString();
}

async function json(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error("Identity service unavailable");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid identity response");
  return payload as Record<string, unknown>;
}

function dataOf(payload: Record<string, unknown>) {
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid identity response");
  return data as Record<string, unknown>;
}

function idOf(value: unknown) {
  return typeof value === "number" || typeof value === "string" ? String(value).trim() : "";
}

export function providerIdOAuth(): GenericOAuthConfig {
  const health = env.MOPH_HEALTH_ID_BASE_URL!;
  const provider = env.MOPH_PROVIDER_ID_BASE_URL!;
  const clientId = env.MOPH_HEALTH_ID_CLIENT_ID!;
  const clientSecret = env.MOPH_HEALTH_ID_CLIENT_SECRET!;
  const providerClientId = env.MOPH_PROVIDER_ID_CLIENT_ID!;
  const providerSecret = env.MOPH_PROVIDER_ID_CLIENT_SECRET!;
  return {
    providerId: PROVIDER_ID, clientId, clientSecret, scopes: [], pkce: false,
    authorizationUrl: serviceUrl(health, "/oauth/redirect"),
    tokenUrl: serviceUrl(health, "/api/v1/token"),
    disableSignUp: true, disableImplicitSignUp: true,
    getToken: async ({ code, redirectURI }) => {
      const healthResponse = await json(await fetch(serviceUrl(health, "/api/v1/token"), {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectURI, client_id: clientId, client_secret: clientSecret }),
        cache: "no-store", signal: AbortSignal.timeout(30000),
      }));
      const healthData = dataOf(healthResponse);
      if (healthResponse.status !== "success" || typeof healthData.access_token !== "string" || !idOf(healthData.account_id)) throw new Error("Invalid Health ID token");
      const tokenResponse = await json(await fetch(serviceUrl(provider, "/api/v1/services/token"), {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: providerClientId, secret_key: providerSecret, token_by: "Health ID", token: healthData.access_token }),
        cache: "no-store", signal: AbortSignal.timeout(30000),
      }));
      const token = dataOf(tokenResponse);
      if (typeof tokenResponse.status !== "number" || tokenResponse.status < 200 || tokenResponse.status >= 300 || typeof token.access_token !== "string" || !idOf(token.account_id)) throw new Error("Invalid Provider ID token");
      return { accessToken: token.access_token, tokenType: "Bearer", raw: { providerAccountId: idOf(token.account_id) } };
    },
    getUserInfo: async (tokens) => {
      if (!tokens.accessToken) return null;
      const response = await json(await fetch(serviceUrl(provider, "/api/v1/services/profile"), {
        headers: { Accept: "application/json", Authorization: `Bearer ${tokens.accessToken}`, "client-id": providerClientId, "secret-key": providerSecret },
        cache: "no-store", signal: AbortSignal.timeout(30000),
      }));
      const profile = dataOf(response);
      const accountId = idOf(profile.account_id);
      const cidHash = typeof profile.hash_cid === "string" ? profile.hash_cid.trim().toLowerCase() : "";
      if (typeof response.status !== "number" || response.status < 200 || response.status >= 300 || !accountId || accountId !== tokens.raw?.providerAccountId || !/^[a-f0-9]{64}$/.test(cidHash)) return null;
      const user = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM User WHERE cidSha256 = ${cidHash} FOR UPDATE`;
        const matched = await tx.user.findUnique({ where: { cidSha256: cidHash }, select: { id: true, name: true, email: true, emailVerified: true, isActive: true, deletedAt: true } });
        if (!matched?.isActive || matched.deletedAt) return null;
        const existing = await tx.account.findUnique({ where: { providerId_accountId: { providerId: PROVIDER_ID, accountId } }, select: { userId: true } });
        if (existing && existing.userId !== matched.id) return null;
        const other = await tx.account.findFirst({ where: { providerId: PROVIDER_ID, userId: matched.id, accountId: { not: accountId } }, select: { id: true } });
        if (other) return null;
        if (!existing) {
          await tx.account.create({ data: { id: randomUUID(), providerId: PROVIDER_ID, accountId, userId: matched.id } });
          await writeAudit(tx, { actorId: matched.id, event: "AUTH_PROVIDER_LINKED", outcome: "SUCCESS", targetType: "USER", targetId: matched.id, metadata: { channel: "PROVIDER_ID" } });
        }
        return matched;
      });
      if (!user) return null;
      return { id: accountId, name: user.name, email: user.email, emailVerified: user.emailVerified };
    },
  };
}
