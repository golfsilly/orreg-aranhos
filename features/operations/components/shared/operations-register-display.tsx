"use client";

import { useEffect, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, LockKeyhole } from "lucide-react";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import type { OperationsColumnOption } from "./operations-table-controls";

type Row = Record<string, unknown>;
const columnOrderStorageKey = "orreg-operations-column-order:v1";

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
  const columnIds = columns.map((column) => column.id);
  const columnKey = columnIds.join("\u0000");
  const [columnOrder, setColumnOrder] = useState<string[]>(columnIds);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  useEffect(() => {
    const currentIds = columnKey ? columnKey.split("\u0000") : [];
    try {
      const saved = JSON.parse(localStorage.getItem(columnOrderStorageKey) ?? "[]");
      const savedIds = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && currentIds.includes(id)) : [];
      // Restore the persisted order after hydration; the server render uses the default order.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColumnOrder([...new Set([...savedIds, ...currentIds])]);
    } catch {
      setColumnOrder(currentIds);
    }
  }, [columnKey]);

  useEffect(() => {
    const resetOrder = () => {
      const currentIds = columnKey ? columnKey.split("\u0000") : [];
      setColumnOrder(currentIds);
      setDraggedColumnId(null);
      try { localStorage.removeItem(columnOrderStorageKey); } catch { /* Keep the default order in memory. */ }
    };
    window.addEventListener("orreg-reset-register-column-order", resetOrder);
    return () => window.removeEventListener("orreg-reset-register-column-order", resetOrder);
  }, [columnKey]);

  const orderedColumns = [...columns].sort((a, b) => {
    const order = columnOrder.length ? columnOrder : columnIds;
    if (a.id === "actions") return -1;
    if (b.id === "actions") return 1;
    return order.indexOf(a.id) - order.indexOf(b.id);
  });
  const visibleColumns = orderedColumns.filter((column) => visibility[column.id] ?? column.defaultVisible);
  const numberColumn = visibleColumns.find((column) => column.id === "number");
  const cardColumns = visibleColumns.filter((column) => column.id !== "number");

  const moveColumn = (sourceId: string, targetId: string) => {
    if (sourceId === targetId || sourceId === "actions" || targetId === "actions") return;
    const order = orderedColumns.map((column) => column.id);
    const sourceIndex = order.indexOf(sourceId);
    const targetIndex = order.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    order.splice(sourceIndex, 1);
    order.splice(targetIndex, 0, sourceId);
    setColumnOrder(order);
    try { localStorage.setItem(columnOrderStorageKey, JSON.stringify(order)); } catch { /* Keep the in-memory order if browser storage is unavailable. */ }
  };

  const startColumnDrag = (event: DragEvent<HTMLButtonElement>, id: string) => {
    setDraggedColumnId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const finishColumnDrop = (event: DragEvent<HTMLButtonElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = draggedColumnId ?? event.dataTransfer.getData("text/plain");
    if (sourceId) moveColumn(sourceId, targetId);
    setDraggedColumnId(null);
  };

  const moveColumnWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = orderedColumns.findIndex((column) => column.id === id);
    const target = orderedColumns[index + (event.key === "ArrowLeft" ? -1 : 1)];
    if (target) moveColumn(id, target.id);
  };

  const renderColumnHeader = (column: OperationsColumnOption) => (
    <th key={column.id} scope="col" aria-sort={column.id === "number" ? numberSortDirection === "asc" ? "ascending" : numberSortDirection === "desc" ? "descending" : "none" : undefined} className={`whitespace-nowrap border-b border-border px-3.5 py-3 text-[11px] font-bold tracking-wide text-muted-foreground ${draggedColumnId === column.id ? "opacity-45" : ""}`}>
      <div className="flex items-center gap-1.5">
        {column.id === "actions" ? <span title="คอลัมน์จัดการถูกตรึงไว้ลำดับแรก" aria-label="คอลัมน์จัดการถูกตรึงไว้ลำดับแรก" className="grid size-5 shrink-0 place-items-center text-primary"><LockKeyhole aria-hidden="true" className="size-3.5" /></span> : <button type="button" draggable aria-label={`ลากเพื่อย้ายคอลัมน์ ${column.label}`} title={`ลากเพื่อย้ายคอลัมน์ ${column.label} · ใช้ปุ่มลูกศรซ้าย/ขวาเมื่อโฟกัส`} onDragStart={(event) => startColumnDrag(event, column.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => finishColumnDrop(event, column.id)} onDragEnd={() => setDraggedColumnId(null)} onKeyDown={(event) => moveColumnWithKeyboard(event, column.id)} className="grid size-5 shrink-0 cursor-grab touch-none place-items-center rounded text-muted-foreground/55 transition hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing">
          <GripVertical aria-hidden="true" className="size-3.5" />
        </button>}
        {column.id === "number" ? <button type="button" onClick={onSortByRegisterNumber} aria-label={numberSortDirection === "asc" ? "เรียงเลขทะเบียนจากมากไปน้อย" : "เรียงเลขทะเบียนจากน้อยไปมาก"} title="เรียงตามเลขทะเบียน" className="inline-flex items-center gap-1.5 rounded-md text-left transition hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"><span>{column.label}</span>{numberSortDirection === "asc" ? <ArrowUp aria-hidden="true" className="size-3.5" /> : numberSortDirection === "desc" ? <ArrowDown aria-hidden="true" className="size-3.5" /> : <ArrowUpDown aria-hidden="true" className="size-3.5" />}</button> : column.label}
      </div>
    </th>
  );

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
            <tr>{visibleColumns.map(renderColumnHeader)}</tr>
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
