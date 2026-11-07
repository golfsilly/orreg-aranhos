import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function SystemDashboardSkeleton() {
  return <LoadingRegion label="กำลังโหลดภาพรวมระบบ" className="space-y-8">
    <div className="rounded-[28px] border border-border bg-card p-6 sm:p-9"><Skeleton className="h-3 w-32" /><Skeleton className="mt-5 h-9 w-72 max-w-full" /><Skeleton className="mt-3 h-4 w-[min(520px,100%)]" /></div>
    <div><Skeleton className="h-3 w-32" /><Skeleton className="mt-2 h-6 w-40" /><div className="mt-4 grid gap-4 xl:grid-cols-2">{[0, 1].map((item) => <div key={item} className="rounded-[22px] border border-border bg-card p-5 sm:p-6"><div className="flex gap-4"><Skeleton className="size-12 shrink-0 rounded-2xl" /><div className="flex-1"><Skeleton className="h-3 w-32" /><Skeleton className="mt-2 h-5 w-48 max-w-full" /><Skeleton className="mt-3 h-4 w-full" /></div></div><div className="mt-5 flex gap-2 border-t border-border pt-4"><Skeleton className="h-10 w-32 rounded-xl" /><Skeleton className="h-10 w-28 rounded-xl" /></div></div>)}</div></div>
    <Skeleton className="h-28 rounded-[22px]" />
  </LoadingRegion>;
}
