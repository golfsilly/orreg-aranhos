import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { defaultRegisterPageSize, getRegisterColumns } from "../../lib/register-columns";

const monthlyColumnCount = getRegisterColumns(false).filter((column) => column.defaultVisible).length;
const dailyColumnCount = getRegisterColumns(true).filter((column) => column.defaultVisible).length;

function SearchFiltersSkeleton() {
  return <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:p-4">
    <Skeleton className="h-11 w-full rounded-xl" />
    <div className="mt-3 flex justify-between gap-2"><Skeleton className="h-10 w-32 rounded-xl" /><Skeleton className="h-10 w-32 rounded-xl" /></div>
    <Skeleton className="mt-2 h-3 w-36" />
  </div>;
}

function DataCardsSkeleton({ columns = monthlyColumnCount }: { columns?: number }) {
  return <div className="grid grid-cols-1 gap-3 md:hidden">{Array.from({ length: 4 }, (_, row) => <div key={row} className="rounded-2xl border border-border bg-card p-4">
    <div className="flex justify-between border-b border-border pb-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-6 w-16 rounded-full" /></div>
    <div className="mt-4 grid grid-cols-2 gap-4">{Array.from({ length: columns - 1 }, (_, col) => <div key={col} className={col === 0 ? "col-span-2" : ""}><Skeleton className="h-3 w-14" /><Skeleton className="mt-2 h-4 w-full" /></div>)}</div>
  </div>)}</div>;
}

function DataTableSkeleton({ columns = monthlyColumnCount }: { columns?: number }) {
  return <div className="hidden overflow-hidden rounded-2xl border border-border md:block"><div className="overflow-x-auto"><div className="min-w-[1200px]"><div className="grid gap-3 border-b border-border bg-muted/40 px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(75px, 1fr))` }}>{Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-3 w-3/4" />)}</div>{Array.from({ length: defaultRegisterPageSize }, (_, row) => <div key={row} className="grid gap-3 border-b border-border px-4 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(75px, 1fr))` }}>{Array.from({ length: columns }, (_, col) => <Skeleton key={col} className="h-4 w-3/4" />)}</div>)}</div></div></div>;
}

export function OperationsSkeleton() {
  return <LoadingRegion label="กำลังโหลดทะเบียนผ่าตัด">
    <div className="mb-5 flex items-start gap-3.5 border-b border-border/70 pb-5 sm:mb-6 sm:gap-4 sm:pb-6">
      <Skeleton className="size-11 shrink-0 rounded-2xl sm:size-12" />
      <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-3 w-56 max-w-full" /><Skeleton className="h-9 w-48" /><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><Skeleton className="h-5 w-96 max-w-full" /><Skeleton className="h-8 w-44 rounded-full" /></div></div>
    </div>
    <div className="mb-4 flex gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:mb-5 sm:w-fit"><Skeleton className="h-11 w-40 flex-1 rounded-lg sm:w-[188px] sm:flex-none" /><Skeleton className="h-11 w-40 flex-1 rounded-lg sm:w-[188px] sm:flex-none" /></div>
    <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 md:flex-row md:items-center md:justify-between"><div className="space-y-2"><Skeleton className="h-6 w-44" /><Skeleton className="h-5 w-72 max-w-full" /></div><div className="flex flex-wrap gap-2"><div><Skeleton className="mb-1 h-3 w-12" /><Skeleton className="h-11 w-36 rounded-xl" /></div><div><Skeleton className="mb-1 h-3 w-24" /><Skeleton className="h-11 w-32 rounded-xl" /></div></div></div>
    <MonthlyRegisterSkeleton />
  </LoadingRegion>;
}

export function OperationTableSkeleton() {
  return <LoadingRegion label="กำลังค้นหารายการผ่าตัด" className="mt-8">
    <div className="flex items-center gap-3"><Skeleton className="h-6 w-28" /><Skeleton className="h-3 w-32" /></div>
    <div className="mt-4"><SearchFiltersSkeleton /></div><div className="mt-4"><DataCardsSkeleton columns={dailyColumnCount} /><DataTableSkeleton columns={dailyColumnCount} /></div><Skeleton className="mt-4 h-12 w-full rounded-xl" />
  </LoadingRegion>;
}

export function MonthlyRegisterSkeleton() {
  return <LoadingRegion label="กำลังโหลดทะเบียนผ่าตัดรายเดือน" className="mt-6 space-y-5">
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5"><Skeleton className="h-4 w-24" /><Skeleton className="mt-2 h-3 w-48" /><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[76px] rounded-2xl sm:h-[84px]" />)}</div></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border border-border p-4"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-7 w-16" /></div>)}</div>
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><Skeleton className="h-4 w-52" /><Skeleton className="mt-2 h-3 w-72 max-w-full" /></div><Skeleton className="h-10 w-44 rounded-xl" /></div>
    <SearchFiltersSkeleton />
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex items-center gap-3"><Skeleton className="h-5 w-72 max-w-full" /><Skeleton className="h-4 w-32" /></div><div className="mt-5"><DataCardsSkeleton /><DataTableSkeleton /></div><Skeleton className="mt-4 h-12 w-full rounded-xl" /></div>
  </LoadingRegion>;
}

export function TeamSkeleton() {
  return <LoadingRegion label="กำลังโหลดทีมผ่าตัด" className="mt-4"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1 rounded-2xl border border-border bg-muted/50 p-1"><Skeleton className="h-10 w-28 flex-1 rounded-xl" /><Skeleton className="h-10 w-32 flex-1 rounded-xl" /></div><Skeleton className="h-3 w-32" /></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">{Array.from({ length: 5 }, (_, index) => <div key={index} className="rounded-2xl border border-border p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-3 h-3 w-1/2" /><div className="mt-4 grid grid-cols-2 gap-3"><Skeleton className="h-8" /><Skeleton className="h-8" /></div></div>)}</div><div className="hidden md:block"><DataTableSkeleton columns={8} /></div></LoadingRegion>;
}

export function EditorSkeleton({ details = false }: { details?: boolean }) {
  return <LoadingRegion label={details ? "กำลังโหลดข้อมูลทะเบียน" : "กำลังโหลดเวลา"} className="mt-4">
    {details && <><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)}</div><div className="mt-6 rounded-2xl border border-border p-5"><Skeleton className="h-4 w-28" /><div className="mt-4 space-y-3">{Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-9 w-52" />)}</div></div></>}
    {details ? <><Skeleton className="mt-5 h-4 w-32" /><Skeleton className="mt-2 h-11 w-full rounded-xl" /><Skeleton className="mt-6 h-24 w-full rounded-xl" /></> : <><Skeleton className="mb-5 h-20 w-full rounded-xl" />{Array.from({ length: 2 }, (_, index) => <div key={index} className="mb-5 rounded-2xl border border-border p-4"><Skeleton className="h-4 w-36" /><Skeleton className="mt-2 h-3 w-64 max-w-full" /><div className="mt-4 grid gap-3 sm:grid-cols-2">{Array.from({ length: 2 }, (_, field) => <div key={field} className="rounded-xl border border-border p-3.5"><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-12 w-full rounded-xl" /><Skeleton className="mt-2 h-12 w-full rounded-xl" /><Skeleton className="mt-2 h-3 w-40" /></div>)}</div></div>)}</>}
    <div className="mt-5 flex justify-end gap-2"><Skeleton className="h-10 w-24 rounded-xl" /><Skeleton className="h-10 w-32 rounded-xl" /></div>
  </LoadingRegion>;
}

export function HistorySkeleton() {
  return <LoadingRegion label="กำลังโหลดประวัติทะเบียน" className="mt-4 space-y-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-2xl border border-border p-4"><div className="flex justify-between"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-32" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div></div>)}</LoadingRegion>;
}
