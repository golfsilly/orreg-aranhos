import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function OperationsSkeleton() {
  return <LoadingRegion label="กำลังโหลดทะเบียนผ่าตัด"><div className="mb-7 space-y-3"><Skeleton className="h-3 w-36" /><Skeleton className="h-9 w-48" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="mb-[30px] rounded-[18px] border border-border bg-card p-4 sm:p-7"><div className="flex flex-wrap items-end gap-3"><div className="w-full sm:w-auto"><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-[50px] w-full rounded-lg sm:w-[220px]" /></div><Skeleton className="h-[50px] w-24 rounded-[10px]" /></div></div><Skeleton className="h-[58px] rounded-2xl" /></LoadingRegion>;
}

export function OperationTableSkeleton() {
  return <LoadingRegion label="กำลังค้นหารายการผ่าตัด" className="mt-[34px]"><div className="flex items-center gap-3"><Skeleton className="h-6 w-28" /><Skeleton className="h-3 w-32" /></div><div className="mt-3 overflow-x-auto"><div className="min-w-[720px]"><div className="grid grid-cols-8 gap-3 border-b border-border py-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-3 w-3/4" />)}</div>{Array.from({ length: 4 }, (_, row) => <div key={row} className="grid grid-cols-8 gap-3 border-b border-border py-4">{Array.from({ length: 8 }, (_, col) => <Skeleton key={col} className={`h-4 ${col === 3 ? "w-full" : "w-3/4"}`} />)}</div>)}</div></div></LoadingRegion>;
}

export function TeamSkeleton() {
  return <LoadingRegion label="กำลังโหลดทีมผ่าตัด" className="mt-4 space-y-4"><Skeleton className="h-4 w-56 max-w-full" />{Array.from({ length: 2 }, (_, i) => <div key={i} className="space-y-3"><Skeleton className="h-4 w-40" /><div className="flex gap-5 border-b border-border py-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-44" /></div></div>)}</LoadingRegion>;
}

export function EditorSkeleton({ details = false }: { details?: boolean }) {
  return <LoadingRegion label={details ? "กำลังโหลดข้อมูลทะเบียน" : "กำลังโหลดเวลาผ่าตัด"} className="mt-4">{details && <><div className="flex flex-wrap gap-5">{Array.from({ length: 3 }, (_, i) => <div key={i} className="flex items-center gap-2.5"><Skeleton className="size-5" /><Skeleton className="h-4 w-14" /></div>)}</div><div className="mt-7 rounded-xl border border-border p-[18px]"><Skeleton className="h-4 w-28" /><div className="mt-4 space-y-3">{Array.from({ length: 2 }, (_, i) => <div key={i} className="flex items-center gap-2.5"><Skeleton className="size-5 rounded-full" /><Skeleton className="h-4 w-40" /></div>)}</div></div></>}<div className={`grid grid-cols-2 gap-x-[18px] gap-y-5 max-[600px]:grid-cols-1 ${details ? "mt-5" : ""}`}>{Array.from({ length: details ? 2 : 4 }, (_, i) => <div key={i}><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-[50px] w-full rounded-lg" /></div>)}</div><Skeleton className="mt-[22px] h-[50px] w-32 rounded-[10px]" /></LoadingRegion>;
}

export function HistorySkeleton() {
  return <LoadingRegion label="กำลังโหลดประวัติทะเบียน" className="mt-4 space-y-4">{Array.from({ length: 2 }, (_, i) => <div key={i} className="space-y-2 border-b border-border pb-4"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-40" /></div>)}</LoadingRegion>;
}
