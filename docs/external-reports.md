# External report API

`GET /api/external/reports?period=month&value=2026-11`

This is a server-to-server, read-only endpoint on OR-Reg. It does not create an
outbound publisher or make the LAN server accessible from the internet. The
hospital website backend needs a private route/VPN to OR-Reg, or an internal
worker must fetch this endpoint and push the snapshot to the website. Do not
call it from public browser JavaScript or expose port 50004 publicly.

## Enable

Set `EXTERNAL_REPORTS_API_KEY` in the server environment to a unique random
secret with at least 32 characters, then restart OR-Reg. Without a key the
endpoint returns 503 and does not read report data. Never use a NEXT_PUBLIC
variable. Generate a secret locally with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Send `Authorization: Bearer <secret>` over HTTPS (terminate HTTPS at the private
reverse proxy if needed). Keep the secret in the website backend, never in URLs,
browser scripts or logs. Rotation means replacing the key on both servers.

## Parameters

| period | value example | Meaning |
| --- | --- | --- |
| day | 2026-11-11 | Calendar day |
| month | 2026-11 | Calendar month |
| year | 2026 | Calendar year, not fiscal year |

Years use Gregorian numbering, 2000–2100. Both parameters are required;
duplicate/unknown parameters and department filters are rejected.

## Response

`schemaVersion: 1`, `period`, `value`, `start`, exclusive `end`, `generatedAt`,
`timezone`, `totalCases`, `sourceCases`, `series`, `departments`, `emergency`,
`averageDurationMinutes`, `durationCases`, `postponed`, `cancelled`, `utilization`,
`roomTimeCases`, `estimatedRoomCases`, `missingUtilizationTimes`, `hosxpAvailable`.

Counts cover registered OR-Reg operations, matching the internal reports.
Emergency names are Elective, Emergency and Unknown; their sum is sourceCases,
which can differ from totalCases when source records are missing. Utilization
uses 24 hours per room/day, merges overlapping intervals, and may include
estimated surgery intervals: retain estimatedRoomCases and missingUtilizationTimes
when presenting it. Null durations are missing data, not zero.

No patient identity, HN, Diagnosis, operation IDs, doctors, procedure names or ward
breakdowns are exported. This is an authenticated integration feed, not automatic
approval to publish every aggregate: select approved metrics and apply the
hospital's small-count disclosure rules before public display.

Successful snapshots are cached in server memory for 5 minutes (maximum 24
periods), with concurrent requests for the same period sharing one calculation.
There are at most two concurrent calculations and 30 authenticated requests per
minute per process. Limits/cache reset on restart; deployment assumes one Node
instance. Apply network/proxy rate limits to unauthenticated traffic.

The receiver should replace snapshots by period/value, never add their counts,
and show generatedAt. On failure, keep the previous snapshot and indicate it is
stale. HOSxP failures do not replace a snapshot with zero counts.

| Status | Meaning |
| --- | --- |
| 200 | Snapshot available; may be cached |
| 400 | Invalid parameters |
| 401 | Missing/incorrect Bearer key |
| 429 | Rate/concurrency limit; follow Retry-After |
| 503 | Disabled, source/database/audit unavailable; retry later |

Reads, denials and failures use EXTERNAL_REPORTS_READ audits without credentials
or patient data. Existing internal /api/reports/statistics keeps session-based
authorization and its original response.
