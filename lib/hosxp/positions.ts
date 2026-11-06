/** HOSxP operation_position.position_id to the hospital's five reporting groups. */
const positionGroups: Readonly<Record<number, number>> = {
  1: 1, // ผู้ทำการผ่าตัด
  5: 2, // Scrub Nurse
  2: 3, // Instrument Nurse
  3: 4, // Circultate Nurse (HOSxP spelling)
  4: 5, // Swab Count Nurse
  6: 5, // Nurse Aid
  7: 5, // คนงาน
  8: 5, // พนักงานห้องผ่าตัด
};

/** An unrecognized HOSxP position remains ungrouped for review. */
export function personnelGroupForPosition(positionId: number): number | null {
  return Object.hasOwn(positionGroups, positionId) ? positionGroups[positionId] : null;
}
