import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import type { OperationsColumnOption } from "./operations-table-controls";

type Row = Record<string, unknown>;

export function OperationsRegisterDisplay({
  rows,
  columns,
  visibility,
  renderCell,
  rowKey,
  label,
  numberSortDirection,
  onSortByRegisterNumber,
}: {
  rows: Row[];
  columns: readonly OperationsColumnOption[];
  visibility: Record<string, boolean>;
  renderCell: (columnId: string, row: Row, index: number) => ReactNode;
  rowKey: (row: Row, index: number) => string;
  label: string;
  numberSortDirection: "asc" | "desc" | null;
  onSortByRegisterNumber: () => void;
}) {
  const visibleColumns = columns.filter((column) => visibility[column.id] ?? column.defaultVisible);
  const numberColumn = visibleColumns.find((column) => column.id === "number");
  const cardColumns = visibleColumns.filter((column) => column.id !== "number");

  return <>
    <div className="grid grid-cols-1 gap-3 md:hidden">
      {rows.map((row, index) => <article data-testid="register-card" key={rowKey(row, index)} className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/[0.025]">
        <header className="flex items-center justify-between gap-3 border-b border-border/70 bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-3">
          <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">ทะเบียนผ่าตัด</span>
          {numberColumn && <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-sm font-bold tabular-nums text-primary"><span>{renderCell(numberColumn.id, row, index)}</span><button type="button" onClick={onSortByRegisterNumber} aria-label={numberSortDirection === "asc" ? "เรียงเลขทะเบียนจากมากไปน้อย" : "เรียงเลขทะเบียนจากน้อยไปมาก"} title="เรียงตามเลขทะเบียน" className="grid size-7 place-items-center rounded-full text-primary transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring">{numberSortDirection === "asc" ? <ArrowUp aria-hidden="true" className="size-3.5" /> : numberSortDirection === "desc" ? <ArrowDown aria-hidden="true" className="size-3.5" /> : <ArrowUpDown aria-hidden="true" className="size-3.5" />}</button></span>}
        </header>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4 p-4">
          {cardColumns.map((column) => <div key={column.id} className={`min-w-0 ${column.fullWidth ? "col-span-2" : ""}`}>
            <dt className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">{column.label}</dt>
            <dd className="m-0 min-w-0 break-words text-sm leading-5 text-foreground">{renderCell(column.id, row, index)}</dd>
          </div>)}
        </dl>
      </article>)}
      {rows.length === 0 && <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">ไม่พบรายการที่ตรงกับเงื่อนไข</p>}
    </div>

    <div className="hidden md:block">
      <ResponsiveScroll label={label}>
        <table data-testid="register-table" className="w-full min-w-max border-collapse text-left text-sm">
          <caption className="sr-only">{label}</caption>
          <thead className="sticky top-0 z-[1] bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <tr>{visibleColumns.map((column) => <th key={column.id} scope="col" aria-sort={column.id === "number" ? numberSortDirection === "asc" ? "ascending" : numberSortDirection === "desc" ? "descending" : "none" : undefined} className="whitespace-nowrap border-b border-border px-3.5 py-3 text-[11px] font-bold tracking-wide text-muted-foreground">{column.id === "number" ? <button type="button" onClick={onSortByRegisterNumber} aria-label={numberSortDirection === "asc" ? "เรียงเลขทะเบียนจากมากไปน้อย" : "เรียงเลขทะเบียนจากน้อยไปมาก"} title="เรียงตามเลขทะเบียน" className="inline-flex items-center gap-1.5 rounded-md text-left transition hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"><span>{column.label}</span>{numberSortDirection === "asc" ? <ArrowUp aria-hidden="true" className="size-3.5" /> : numberSortDirection === "desc" ? <ArrowDown aria-hidden="true" className="size-3.5" /> : <ArrowUpDown aria-hidden="true" className="size-3.5" />}</button> : column.label}</th>)}</tr>
          </thead>
          <tbody>{rows.map((row, index) => <tr key={rowKey(row, index)} className="align-top odd:bg-background even:bg-muted/20 hover:bg-primary/[0.045]">
            {visibleColumns.map((column) => <td key={column.id} className={`border-b border-border/80 ${column.id === "startTime" || column.id === "endTime" ? "p-0" : "px-3.5 py-3.5"}`}>{renderCell(column.id, row, index)}</td>)}
          </tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="m-0 px-4 py-12 text-center text-sm text-muted-foreground">ไม่พบรายการที่ตรงกับเงื่อนไข</p>}
      </ResponsiveScroll>
    </div>
  </>;
}
