import { personnelGroupForPosition } from "../../../lib/hosxp/positions.ts";

export const operationTeamGroups = [
  { id: 1, name: "ผู้ทำการผ่าตัด", description: "" },
  { id: 2, name: "Scrub Nurse", description: "" },
  { id: 3, name: "Instrument Nurse", description: "" },
  { id: 4, name: "Circulate Nurse", description: "" },
  { id: 5, name: "ทีมช่วยผ่าตัด", description: "Swab Count Nurse · Nurse Aid · คนงาน · พนักงานห้องผ่าตัด" },
] as const;

type TeamMember = Record<string, unknown>;
const number = (value: unknown) => typeof value === "number" || typeof value === "string" && value.trim() ? Number(value) : NaN;

/** Use the hospital's position mapping and preserve unsupported positions for review. */
export function groupOperationTeam(team: TeamMember[]) {
  const groups = operationTeamGroups.map((group) => ({ ...group, members: [] as TeamMember[] }));
  const ungrouped: TeamMember[] = [];
  for (const member of team) {
    const mapped = personnelGroupForPosition(number(member.position_id));
    const group = groups.find((item) => item.id === (mapped ?? number(member.personnelGroup)));
    if (group) group.members.push(member);
    else ungrouped.push(member);
  }
  return { groups, ungrouped };
}
