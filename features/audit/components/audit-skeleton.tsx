import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function AuditSkeleton() {
  return <LoadingRegion label="กำลังโหลดประวัติการใช้งาน"><div className="mb-7 space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="rounded-[20px] border border-border bg-card p-5 sm:p-7"><Skeleton className="h-5 w-36" /><div className="mt-5 overflow-hidden"><div className="min-w-[960px]">{Array.from({ length: 7 }, (_, row) => <div key={row} className="grid grid-cols-6 gap-4 border-b border-border py-4">{Array.from({ length: 6 }, (_, column) => <Skeleton key={column} className="h-4 w-3/4" />)}</div>)}</div></div></div></LoadingRegion>;
}
