import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <LoadingRegion
      label="กำลังโหลดหน้าหลัก"
      className="min-h-screen bg-background text-foreground"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10 xl:px-14">
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-border/65 sm:h-20">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Skeleton className="size-10 shrink-0 rounded-xl sm:size-11" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-2 w-36 max-w-full" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Skeleton className="hidden h-8 w-24 md:block" />
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="size-11 rounded-full min-[420px]:w-32 sm:w-40" />
          </div>
        </header>

        <section className="grid items-center gap-8 pb-12 pt-9 sm:gap-10 sm:pb-16 sm:pt-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-10 lg:pb-20 lg:pt-14">
          <div className="space-y-5 lg:py-8">
            <Skeleton className="h-7 w-64 max-w-full rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-12 w-72 max-w-full sm:h-16" />
              <Skeleton className="h-12 w-56 max-w-full sm:h-16" />
            </div>
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-full max-w-lg" />
              <Skeleton className="h-4 w-4/5 max-w-md" />
            </div>
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-12 w-36 rounded-xl" />
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>
            <Skeleton className="h-10 w-full max-w-md border-t border-border/70 pt-3" />
          </div>
          <Skeleton className="h-[460px] rounded-[28px] sm:h-[580px] sm:rounded-[36px] lg:h-[620px] xl:h-[660px]" />
        </section>

        <section className="border-t border-border/70 py-9 sm:py-12 lg:py-14">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-40" />
              <Skeleton className="h-6 w-52" />
            </div>
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="grid gap-3 md:grid-cols-3 sm:gap-4">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/70 bg-card/55 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="size-9 rounded-xl" />
                  <Skeleton className="h-3 w-5" />
                </div>
                <Skeleton className="mt-4 h-2.5 w-28" />
                <Skeleton className="mt-2 h-4 w-36" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border/70 py-5 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-[30px] rounded-full" />
              <Skeleton className="h-6 w-px" />
              <Skeleton className="h-[30px] w-[26px] rounded-full" />
              <div className="ml-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-28" />
              </div>
            </div>
            <div className="space-y-1.5 sm:text-right">
              <Skeleton className="h-3 w-72 max-w-full" />
              <Skeleton className="h-2.5 w-52 max-w-full" />
            </div>
          </div>
        </footer>
      </div>
    </LoadingRegion>
  );
}
