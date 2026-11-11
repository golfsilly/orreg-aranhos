import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { StatisticsLoading } from "./statistics-loading";

export function ReportsSkeleton({ overview = false }: { overview?: boolean }) {
  return <LoadingRegion label={overview ? "กำลังโหลดภาพรวมงานผ่าตัด" : "กำลังโหลดรายงานและสถิติ"} className="space-y-6"><div className="rounded-2xl border border-border bg-card p-5 sm:p-7"><Skeleton className="h-3 w-40" /><Skeleton className="mt-3 h-8 w-56 max-w-full" /><Skeleton className="mt-3 h-4 w-80 max-w-full" /></div><div className="grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item}><Skeleton className="mb-2 h-3 w-16" /><Skeleton className="h-10 w-full rounded-xl" /></div>)}</div><Skeleton className="h-4 w-64 max-w-full" /><StatisticsLoading overview={overview} />{!overview && <Skeleton className="h-20 rounded-2xl" />}</LoadingRegion>;
}
