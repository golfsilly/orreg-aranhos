export type OperationsColumnOption = { id: string; label: string; defaultVisible: boolean; fullWidth?: boolean };

export const registerColumns = [
  { id: "actions", label: "จัดการ", defaultVisible: true, fullWidth: true },
  { id: "number", label: "เลขทะเบียน", defaultVisible: true },
  { id: "operationId", label: "รหัส HOSxP", defaultVisible: false },
  { id: "hn", label: "HN", defaultVisible: true },
  { id: "patient", label: "ชื่อผู้ป่วย", defaultVisible: true },
  { id: "age", label: "อายุ", defaultVisible: true },
  { id: "ward", label: "Ward", defaultVisible: true },
  { id: "operationDate", label: "วันที่ผ่าตัด", defaultVisible: true },
  { id: "startTime", label: "เวลาเริ่มผ่า", defaultVisible: true },
  { id: "endTime", label: "เวลาผ่าเสร็จ", defaultVisible: true },
  { id: "department", label: "แผนก", defaultVisible: true },
  { id: "room", label: "ห้องผ่าตัด", defaultVisible: true },
  { id: "urgency", label: "ความเร่งด่วน", defaultVisible: true },
  { id: "diagnosis", label: "Diagnosis", defaultVisible: false },
  { id: "surgeryClass", label: "ประเภทผ่าตัด", defaultVisible: false },
  { id: "anesthesia", label: "ชนิดการดมยา", defaultVisible: false },
  { id: "wound", label: "ลักษณะแผล", defaultVisible: false },
  { id: "preOp", label: "Pre-op", defaultVisible: false },
  { id: "postOp", label: "Post-op", defaultVisible: false },
  { id: "patho", label: "Patho", defaultVisible: false },
  { id: "remark", label: "หมายเหตุ", defaultVisible: false },
  { id: "status", label: "สถานะ", defaultVisible: false },
] as const satisfies readonly OperationsColumnOption[];

export type RegisterColumnId = typeof registerColumns[number]["id"];
export const getRegisterColumns = (showDepartment: boolean) => registerColumns.filter((column) => showDepartment || column.id !== "department");
export const defaultColumnVisibility = () => Object.fromEntries(registerColumns.map((column) => [column.id, column.defaultVisible])) as Record<RegisterColumnId, boolean>;
export const registerPageSizes = [10, 20, 50] as const;
export const defaultRegisterPageSize = 10;
