type TeamMember = Record<string, unknown>;

/** Keep every assignment, including repeated staff and legacy responses without row IDs. */
export function operationTeamRows(team: TeamMember[]) {
  const occurrences = new Map<string, number>();
  return team.map((member) => {
    const identity = member.teamRowId != null
      ? ["row", String(member.teamRowId)]
      : ["assignment", ...[
        "operation_detail_id", "position_id", "doctor", "doctor_name", "operation_item_name",
        "enteredDate", "enteredTime", "exitedDate", "exitedTime",
      ].map((field) => member[field] == null ? "" : String(member[field]))];
    const signature = JSON.stringify(identity);
    const occurrence = occurrences.get(signature) ?? 0;
    occurrences.set(signature, occurrence + 1);
    return { member, key: JSON.stringify([identity, occurrence]) };
  });
}
