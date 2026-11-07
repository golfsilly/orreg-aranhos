import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, username } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { providerIdConfigured, providerIdOAuth } from "@/lib/provider-id";
import { sendPasswordReset } from "@/lib/mail";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit/write";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: MIN_PASSWORD_LENGTH, maxPasswordLength: MAX_PASSWORD_LENGTH, resetPasswordTokenExpiresIn: 3600, revokeSessionsOnPasswordReset: true, sendResetPassword: async ({ user, url }) => { try { await sendPasswordReset(user.email, url); } catch { console.error("Password reset email delivery failed"); } }, onPasswordReset: async ({ user }) => { await writeAudit(prisma, { actorId: user.id, event: "AUTH_PASSWORD_RESET", outcome: "SUCCESS", targetType: "USER", targetId: user.id, metadata: { channel: "EMAIL" } }); } },
  account: { encryptOAuthTokens: true, accountLinking: { enabled: true, disableImplicitLinking: true } },
  // Password changes use the audited, transactional profile endpoint.
  disabledPaths: ["/is-username-available", "/change-password", "/set-password", "/update-user", "/change-email", "/delete-user"],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isActive: true, deletedAt: true } });
          if (!user?.isActive || user.deletedAt) return false;
        },
        after: async (session, context) => {
          const path = context?.path ?? "";
          const channel = path.includes("username") ? "USERNAME" : path.includes("/callback/") ? "PROVIDER_ID" : path.includes("/sign-in/email") ? "EMAIL" : "SESSION";
          try {
            await writeAudit(prisma, { actorId: session.userId, event: "AUTH_SESSION_CREATED", outcome: "SUCCESS", targetType: "USER", targetId: session.userId, metadata: { channel } });
          } catch (error) {
            // Do not leave a usable newly-created session when its audit insert fails.
            await prisma.session.deleteMany({ where: { id: session.id } });
            throw error;
          }
        },
      },
    },
  },
  plugins: [username({ displayUsername: false, immutableUsername: true }), ...(providerIdConfigured() ? [genericOAuth({ config: [providerIdOAuth()] })] : []), nextCookies()],
});
