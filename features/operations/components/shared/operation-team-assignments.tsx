import { ResponsiveScroll } from "@/components/ui/responsive-scroll";
import { formatThaiDateValue } from "./thai-date-picker";
import { operationTeamRows } from "../../lib/operation-team-rows";

type TeamMember = Record<string, unknown>;
const value = (input: unknown) => typeof input === "string" || typeof input === "number" ? String(input) : "—";
const dateValue = (input: unknown) => typeof input === "string" ? formatThaiDateValue(input) : "—";
const timeValue = (input: unknown) => typeof input === "string" ? input.slice(0, 5) : "—";

export function OperationTeamAssignments({ team, label = "ตารางทีมผ่าตัดและเวลาเข้าออกห้องผ่าตัด" }: { team: TeamMember[]; label?: string }) {
  const rows = operationTeamRows(team);
  return <>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
      {rows.map(({ member, key }, index) => <article key={key} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm shadow-black/[0.025]">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold tabular-nums text-primary">{index + 1}</span>
          <div className="min-w-0 flex-1"><p className="m-0 truncate text-[11px] font-medium text-muted-foreground">{value(member.operation_item_name)}</p><p className="mb-0 mt-1 truncate text-sm font-semibold text-foreground">{value(member.doctor_name)}</p><p className="mb-0 mt-1 text-xs text-primary">{value(member.position_name)}</p></div>
        </div>
        <dl className="mb-0 mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
          <div><dt className="text-[10px] font-semibold text-muted-foreground">วันที่เข้า · เวลา</dt><dd className="m-0 mt-1 text-xs tabular-nums text-foreground">{dateValue(member.enteredDate)}<span className="ml-1.5 text-muted-foreground">{timeValue(member.enteredTime)}</span></dd></div>
          <div><dt className="text-[10px] font-semibold text-muted-foreground">วันที่ออก · เวลา</dt><dd className="m-0 mt-1 text-xs tabular-nums text-foreground">{dateValue(member.exitedDate)}<span className="ml-1.5 text-muted-foreground">{timeValue(member.exitedTime)}</span></dd></div>
        </dl>
      </article>)}
    </div>
    <div className="mt-4 hidden md:block">
      <ResponsiveScroll label={label}>
        <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
          <caption className="sr-only">{label}</caption>
          <thead className="bg-muted/60"><tr>{["ลำดับ", "การผ่าตัด", "เจ้าหน้าที่", "ตำแหน่ง", "วันที่เข้า", "เวลาเข้า", "วันที่ออก", "เวลาออก"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap border-b border-border px-3 py-3 font-semibold text-muted-foreground">{heading}</th>)}</tr></thead>
          <tbody>{rows.map(({ member, key }, index) => <tr key={key} className="even:bg-muted/25 hover:bg-primary/[0.035]">
            <td className="border-b border-border px-3 py-3 tabular-nums">{index + 1}</td><td className="max-w-[340px] border-b border-border px-3 py-3">{value(member.operation_item_name)}</td><td className="border-b border-border px-3 py-3 font-medium">{value(member.doctor_name)}</td><td className="border-b border-border px-3 py-3">{value(member.position_name)}</td><td className="whitespace-nowrap border-b border-border px-3 py-3">{dateValue(member.enteredDate)}</td><td className="whitespace-nowrap border-b border-border px-3 py-3 tabular-nums">{timeValue(member.enteredTime)}</td><td className="whitespace-nowrap border-b border-border px-3 py-3">{dateValue(member.exitedDate)}</td><td className="whitespace-nowrap border-b border-border px-3 py-3 tabular-nums">{timeValue(member.exitedTime)}</td>
          </tr>)}</tbody>
        </table>
      </ResponsiveScroll>
    </div>
  </>;
}
