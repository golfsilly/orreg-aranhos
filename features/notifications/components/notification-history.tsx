"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { CheckCircle2, Clock3, Inbox, TriangleAlert } from "lucide-react";
import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import { monitorErrorLabel, type MonitorRow } from "@/lib/notifications/monitor-contract";
import { monitorTime } from "./monitor-overview";

const features = tableFeatures({});
const column = createColumnHelper<typeof features, MonitorRow>();
const columns = column.columns([
  column.accessor("operationId", { header: "รหัส HOSxP" }),
  column.accessor("patient", { header: "ผู้ป่วย" }),
  column.accessor("status", { header: "สถานะ" }),
  column.accessor("createdAt", { header: "เริ่มดำเนินการ" }),
  column.accessor("sentAt", { header: "บันทึกการตอบรับ" }),
  column.accessor("errorCode", { header: "รายละเอียด" }),
]);

function DeliveryStatus({ status }: { status: MonitorRow["status"] }) {
  const sent = status === "SENT";
  const review = status === "REVIEW";
  const Icon = sent ? CheckCircle2 : review ? TriangleAlert : Clock3;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${sent ? "border-primary/15 bg-primary/8 text-primary" : review ? "border-amber-500/20 bg-amber-500/8 text-amber-800 dark:text-amber-200" : "border-border bg-muted/40 text-muted-foreground"}`}><Icon className="size-3.5" />{sent ? "ตอบรับแล้ว" : review ? "ต้องตรวจสอบ" : status === "CLAIMED" ? "ยังไม่ยืนยันผล" : "ไม่ทราบสถานะ"}</span>;
}
function PatientIdentity({ row }: { row: MonitorRow }) {
  return <div><p className="break-words font-medium leading-6 text-foreground">{row.patient?.name || (row.patient ? "ต้นทางไม่ระบุชื่อ" : "ยังอ่านผู้ป่วยจาก HOSxP ไม่ได้")}</p><p className="mt-0.5 text-xs text-muted-foreground">HN <span className="font-mono tabular-nums">{row.patient?.hn || "—"}</span></p></div>;
}
function DeliveryDetail({ row }: { row: MonitorRow }) {
  return row.errorCode ? <p className="text-xs leading-5 text-muted-foreground">{monitorErrorLabel(row.errorCode)}<span className="mt-1 block break-all font-mono text-[10px]">{row.errorCode}</span></p> : <p className="text-xs leading-5 text-muted-foreground">{row.status === "SENT" ? "MOPH ตอบรับ หรือยืนยันผลส่งแล้ว" : "บันทึกเริ่มส่งไว้แล้ว ยังไม่มีผลสำเร็จ"}</p>;
}

export function NotificationHistory({ rows }: { rows: MonitorRow[] }) {
  const table = useTable({ features, columns, data: rows });
  if (!rows.length) return <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center"><span className="mb-4 grid size-12 place-items-center rounded-2xl border border-border bg-muted/30 text-muted-foreground"><Inbox className="size-5" /></span><h3 className="text-sm font-semibold">ไม่พบรายการในช่วงนี้</h3><p className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">ลองเปลี่ยนตัวกรองหรือเลือกย้อนหลัง 7 วัน ประวัติรายเคสเริ่มบันทึกตั้งแต่เปิดใช้ระบบกันซ้ำ</p></div>;
  return <>
    <div className="divide-y divide-border/70 lg:hidden">{table.getRowModel().rows.map(({ original: row }) => <article key={row.operationId} className="space-y-3 px-4 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-primary">HOSxP #{row.operationId}</span><DeliveryStatus status={row.status} /></div><PatientIdentity row={row} /><dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/25 p-3 text-[11px] leading-5"><div><dt className="text-muted-foreground">เริ่มดำเนินการ</dt><dd className="font-medium">{monitorTime(row.createdAt)}</dd></div><div><dt className="text-muted-foreground">บันทึกการตอบรับ</dt><dd className="font-medium">{row.sentAt ? monitorTime(row.sentAt) : "—"}</dd></div></dl><DeliveryDetail row={row} /></article>)}</div>
    <div className="hidden lg:block"><ResponsiveScroll label="ประวัติส่งแจ้งเตือน เลื่อนด้านข้างเพื่อดูข้อมูล"><table className="w-full min-w-[1050px] border-collapse text-left text-sm"><thead><tr className="border-b border-border bg-muted/25">{["รหัส HOSxP", "ผู้ป่วย", "สถานะ", "เริ่มดำเนินการ", "บันทึกการตอบรับ", "รายละเอียด"].map((label) => <th key={label} className="px-5 py-3.5 text-[11px] font-semibold text-muted-foreground">{label}</th>)}</tr></thead><tbody>{table.getRowModel().rows.map(({ original: row }) => <tr key={row.operationId} className="border-b border-border/60 align-top transition-colors last:border-0 hover:bg-muted/20"><td className="px-5 py-4 font-mono text-xs font-semibold tabular-nums text-primary">{row.operationId}</td><td className="w-60 px-5 py-4"><PatientIdentity row={row} /></td><td className="px-5 py-4"><DeliveryStatus status={row.status} /></td><td className="max-w-40 px-5 py-4 text-xs leading-6 text-muted-foreground">{monitorTime(row.createdAt)}</td><td className="max-w-40 px-5 py-4 text-xs leading-6 text-muted-foreground">{row.sentAt ? monitorTime(row.sentAt) : "—"}</td><td className="max-w-64 px-5 py-4"><DeliveryDetail row={row} /></td></tr>)}</tbody></table></ResponsiveScroll></div>
  </>;
}
