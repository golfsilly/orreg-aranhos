import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function AuthSkeleton({ variant }: { variant: "provider" | "signin" | "forgot" | "reset" }) {
  return <LoadingRegion label="กำลังโหลดหน้าเข้าสู่ระบบ"><Skeleton className="mb-7 size-14 rounded-[18px]" /><Skeleton className="h-3 w-36" /><Skeleton className="mt-3 h-10 w-48" /><Skeleton className="mt-3 h-4 w-72 max-w-full" />
    {variant === "provider" || variant === "signin" ? <><Skeleton className="mt-8 h-14 w-full rounded-xl" />{variant === "signin" && <><div className="my-7 flex items-center gap-4"><Skeleton className="h-px flex-1" /><Skeleton className="h-3 w-40" /><Skeleton className="h-px flex-1" /></div><div className="space-y-5">{Array.from({ length: 2 }, (_, i) => <div key={i}><Skeleton className="h-4 w-32" /><Skeleton className="mt-2 h-13 w-full rounded-xl" /></div>)}<Skeleton className="ml-auto h-4 w-24" /><Skeleton className="h-14 w-full rounded-xl" /></div></>}<Skeleton className="mx-auto mt-8 h-3 w-52" /></> : <><div className="mt-8 space-y-5">{Array.from({ length: variant === "reset" ? 2 : 1 }, (_, i) => <div key={i}><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-13 w-full rounded-xl" /></div>)}<Skeleton className="h-14 w-full rounded-xl" /></div><Skeleton className="mt-8 h-4 w-40" /></>}
  </LoadingRegion>;
}
