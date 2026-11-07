<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project conventions

- Use pnpm for dependency installation and project scripts; maintain `pnpm-lock.yaml` as the lockfile.
- Use Tailwind CSS v4 utility classes directly in `className` for component styling, including long class lists when appropriate.
- Prefer shadcn/ui components built on Base UI for interface controls and composition.
- Validate environment variables with `@t3-oss/env-nextjs` and Zod through `lib/env.ts` or `lib/cli-env.ts`; do not read `process.env` directly elsewhere. The sole exception is Next.js's compile-time `NEXT_RUNTIME` guard in `instrumentation.ts`, which also validates that value with T3 Env and lets Next.js exclude Node-only code from its Edge bundle.
- Use TanStack Query for client-side server state and mutations, TanStack Table for tables, and Recharts for charts. Keep sensitive query data transient and clear it on sign-out.
- Use React Hook Form with `@hookform/resolvers` and Zod for forms, Zustand for shared client UI state, and Sonner for transient notifications. Preserve server-side authorization and validation.
- Keep page route folders limited to `page.tsx` and a matching `loading.tsx`; put UI, state, and loading skeleton components under `features/`. Keep Next.js required files such as root/group layouts, root styles and metadata, and API `route.ts` in `app/`.
- Every page must provide a `loading.tsx` with a skeleton that follows the real page layout and supports light/dark themes; provide matching skeletons for in-page data fetching as well.
- Audit all authentication/security events, access to identifiable clinical data, account administration, and clinical mutations. Use `lib/audit/write.ts`, add event names to its allowlist, and write mutation events inside the same database transaction as the change. Record denied access without untrusted request content. Never include passwords, tokens, CID, patient names, HN, raw request/response bodies, or unredacted errors in the central audit log. Only superadmins may view audit logs.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
