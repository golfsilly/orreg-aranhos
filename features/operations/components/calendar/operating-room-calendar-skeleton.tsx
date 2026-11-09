import { Skeleton } from "@/components/ui/skeleton";

export function OperatingRoomCalendarSkeleton() {
  return <section aria-label="กำลังโหลดปฏิทินห้องผ่าตัด" aria-busy="true" className="space-y-4">
    <div className="grid gap-3 md:hidden">{Array.from({ length: 3 }, (_, room) => <div key={room} className="overflow-hidden rounded-2xl border border-border bg-card"><Skeleton className="h-12 rounded-none" />{Array.from({ length: 2 }, (_, index) => <div key={index} className="grid grid-cols-[52px_1fr] gap-2 p-3"><Skeleton className="mt-3 h-3 w-10" /><Skeleton className="h-24 rounded-xl" /></div>)}</div>)}</div>
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block"><div className="grid grid-cols-4 border-b border-border p-3">{Array.from({ length: 4 }, (_, room) => <Skeleton key={room} className="mx-2 h-10" />)}</div><div className="grid grid-cols-4 gap-3 p-3">{Array.from({ length: 4 }, (_, room) => <div key={room} className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-28" /><Skeleton className="h-20" /></div>)}</div></div>
  </section>;
}
