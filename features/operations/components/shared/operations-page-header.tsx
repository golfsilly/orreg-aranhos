import { ClipboardList, Database } from "lucide-react";

export function OperationsPageHeader() {
  return (
    <header className="mb-5 border-b border-border/70 pb-5 sm:mb-6 sm:pb-6">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary sm:size-12">
          <ClipboardList aria-hidden="true" className="size-5 sm:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="m-0 text-[10px] font-bold tracking-[0.18em] text-primary">
              SURGERY REGISTER
            </p>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              ทะเบียนผ่าตัด
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground sm:text-[30px]">
                ทะเบียนผ่าตัด
              </h1>
              <p className="mb-0 mt-1 text-sm leading-6 text-muted-foreground">
                ค้นหารายวัน หรือเปิดทะเบียนรายเดือนแยกตามแผนก
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Database aria-hidden="true" className="size-3.5 text-primary" />
              ข้อมูลผู้ป่วยจาก HOSxP
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
