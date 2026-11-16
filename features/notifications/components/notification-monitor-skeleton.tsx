import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function NotificationOverviewSkeleton() {
  return <LoadingRegion label="กำลังโหลดสถานะแจ้งเตือน" className="space-y-5">
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"><Skeleton className="size-10 rounded-xl" /><Skeleton className="h-7 w-44" /><Skeleton className="h-4 w-full max-w-96" /><Skeleton className="h-4 w-56" /></div>
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">{Array.from({ length: 4 }, (_, i) => <div key={i} className="flex justify-between gap-6"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-24" /></div>)}</div>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></div>)}</div>
  </LoadingRegion>;
}

export function NotificationHistorySkeleton() {
  return <LoadingRegion label="กำลังโหลดประวัติการส่ง" className="divide-y divide-border/60">{Array.from({ length: 6 }, (_, i) => <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-5 sm:grid-cols-[0.6fr_1.4fr_1fr_1fr] sm:px-6"><div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-16" /></div><div className="space-y-2"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-3 w-24" /></div><Skeleton className="hidden h-6 w-24 rounded-full sm:block" /><Skeleton className="hidden h-4 w-28 sm:block" /></div>)}</LoadingRegion>;
}

export function NotificationMonitorSkeleton() {
  return <div className="mx-auto w-full max-w-7xl space-y-5"><div className="space-y-3 py-1"><Skeleton className="h-3 w-36" /><Skeleton className="h-9 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div><NotificationOverviewSkeleton /><div className="overflow-hidden rounded-2xl border border-border bg-card"><div className="space-y-4 border-b border-border p-5"><Skeleton className="h-5 w-36" /><div className="flex flex-wrap gap-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-72 max-w-full" /></div></div><NotificationHistorySkeleton /></div></div>;
}
