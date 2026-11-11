import { env } from "@/lib/env";

const trustedOrigin = new URL(env.BETTER_AUTH_URL).origin;

/** Validate browser mutations against the configured public app origin. */
export function hasTrustedRequestOrigin(request: Request): boolean {
  return request.headers.get("origin") === trustedOrigin;
}
