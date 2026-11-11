import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit/write";
import { loadStatistics } from "@/lib/register/statistics-service";
import { statisticsRange } from "@/lib/register/statistics";
import { externalStatistics, validReportsKey } from "@/lib/register/external-statistics";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const schema = z.object({ period: z.enum(["day", "month", "year"]), value: z.string().min(4).max(10) }).strict();
type Snapshot = ReturnType<typeof externalStatistics>;
const cache = new Map<string, { expires: number; data: Snapshot }>();
const pending = new Map<string, Promise<Snapshot>>();
let windowStart = 0;
let requests = 0;

export async function GET(request: Request) {
  try {
    if (!env.EXTERNAL_REPORTS_API_KEY) return Response.json({ error: "External reports are disabled" }, { status: 503, headers });
    if (!validReportsKey(request.headers.get("authorization"), env.EXTERNAL_REPORTS_API_KEY)) {
      await writeAudit(prisma, { event: "EXTERNAL_REPORTS_READ", outcome: "DENIED" });
      return Response.json({ error: "Unauthorized" }, { status: 401, headers });
    }
    const now = Date.now();
    if (now - windowStart >= 60_000) { windowStart = now; requests = 0; }
    if (++requests > 30) return Response.json({ error: "Too many requests" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
    const params = new URL(request.url).searchParams;
    const parsed = schema.safeParse(Object.fromEntries(params));
    if (!parsed.success || [...params.keys()].length !== 2) return Response.json({ error: "Expected period and value" }, { status: 400, headers });
    const { period, value } = parsed.data;
    try {
      statisticsRange(period, value);
      if (Number(value.slice(0, 4)) < 2000 || Number(value.slice(0, 4)) > 2100) throw new Error("Invalid year");
    } catch {
      return Response.json({ error: "Invalid report period" }, { status: 400, headers });
    }
    const key = `${period}:${value}`;
    const cached = cache.get(key);
    let data = cached && cached.expires > now ? cached.data : undefined;
    if (!data) {
      let work = pending.get(key);
      if (!work) {
        if (pending.size >= 2) return Response.json({ error: "Reports busy" }, { status: 429, headers: { ...headers, "Retry-After": "10" } });
        work = loadStatistics(period, value).then((result) => {
          // Do not publish an incomplete HOSxP result as a complete snapshot.
          if (!result.hosxpAvailable) throw new Error("Source unavailable");
          const snapshot = externalStatistics(result);
          if (cache.size >= 24) cache.delete(cache.keys().next().value!);
          cache.set(key, { expires: Date.now() + 300_000, data: snapshot });
          return snapshot;
        }).finally(() => pending.delete(key));
        pending.set(key, work);
      }
      data = await work;
    }
    await writeAudit(prisma, { event: "EXTERNAL_REPORTS_READ", outcome: "SUCCESS", targetId: key, metadata: { reportPeriod: data.period, total: data.totalCases } });
    return Response.json(data, { headers });
  } catch {
    await writeAudit(prisma, { event: "EXTERNAL_REPORTS_READ", outcome: "FAILURE" }).catch(() => undefined);
    return Response.json({ error: "Reports temporarily unavailable" }, { status: 503, headers });
  }
}
