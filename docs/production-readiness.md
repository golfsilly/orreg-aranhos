# OR-Reg production readiness

## Application scope

The first rollout is limited to the surgery register, operating room calendar, and reports. `ORREG_POSTOP_ENABLED` and `ORREG_EQUIPMENT_ENABLED` default to `false`; disabled modules are removed from workspace navigation and their server authorization checks deny access. Keep both values `false` until those modules pass their own review.

## Production host

- Run one persistent Node.js instance on `192.168.4.30:50004`. The `start` script uses this port. Do not run multiple instances while the in-process Set OR scheduler is enabled.
- Configure the Windows service or Task Scheduler to start the app after the application database and network are ready, and restart it after an unexpected exit.
- Restrict TCP port `50004` to approved hospital VLANs/firewall rules. The selected LAN URL is HTTP; HTTP does not encrypt credentials, session cookies, or clinical data in transit. Internal HTTPS is recommended before handling real patient data.
- Set `BETTER_AUTH_URL` to the exact production origin and register the matching Provider ID callback URL with the identity provider. Test sign-in and callback on the actual URL.

## Environment values still required

Provide these through the server's protected environment configuration, never in source control or chat:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Password-reset email cannot work until all five are configured and tested.
- HOSxP: the separate HOSxP account must have database-level `SELECT` grants only. Keep the HOSxP connection settings separate from `DATABASE_URL`.
- Provider ID and MOPH Notify credentials must be confirmed for the production identity provider and the intended notification group. Send only a synthetic, de-identified notification during smoke testing.

The ignored local `.env.production` currently has `BETTER_AUTH_URL` set to `http://192.168.4.30:50004`; its SMTP values are absent. Do not copy this local file into Git.

## Database migration and backup

1. Use the hospital central backup system to back up the OR-Reg database and restore it to an isolated test database. Verify application login and sample records against the restored copy.
2. Confirm `DATABASE_URL` points to the dedicated `orreg_aranhos` application database. Never run Prisma migrations against HOSxP.
3. Review `pnpm exec prisma migrate status` against the intended OR-Reg database. Apply pending migrations with `pnpm exec prisma migrate deploy` only after the backup/restore check succeeds.
4. Record the migration result and retain the tested restore point according to hospital policy.

No production migration or restore is performed by this repository validation pass.

## Pre-launch checks

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- In PowerShell, run `$serverTests = Get-ChildItem tests/*.test.mjs | Where-Object { $_.Name -ne 'workspace-navigation.test.mjs' } | ForEach-Object { $_.FullName }`, then `node --conditions=react-server --test $serverTests` and `node --test tests/workspace-navigation.test.mjs`. The isolated user lifecycle test requires a dedicated test server at `http://localhost:3105` and remains skipped when that test environment is not configured.
- `pnpm build` and then a smoke test on the production host.
- Verify Provider ID sign-in, HOSxP reads, register/calendar/report PDF, SMTP reset email, and a synthetic MOPH message. Confirm permissions for each role and inspect audit/log output for sensitive data.
- After restart, confirm the Set OR notifier checks every five minutes and audit retention continues to prune entries older than 30 days.

Passing local build, lint, and unit tests does not establish connectivity to the hospital HOSxP database, Provider ID, SMTP, MOPH Notify, firewall, or backup/restore service. Those checks require the hospital network and credentials.
