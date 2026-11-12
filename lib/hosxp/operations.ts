import { env } from "@/lib/env";
import { createPool, type Pool } from "mariadb";
import "server-only";
import { dayRange, monthRange } from "./date-range";
import {
  operationAnalyticsForRangeSql,
  operationsForDaySql,
} from "./operation-query";
import { personnelGroupForPosition } from "./positions";

type HosxpRow = Record<string, unknown>;
const POOL_VERSION = 2;
const globalHosxp = globalThis as typeof globalThis & {
  hosxpPool?: Pool;
  hosxpPoolVersion?: number;
};

function teamAttendance(row: HosxpRow) {
  const entries = Object.entries(row).map(([key, value]) => ({
    key,
    normalized: key.toLowerCase().replace(/[^a-z0-9]/g, ""),
    value,
  }));
  const aliases = {
    enteredDate: [
      "datein",
      "indate",
      "enterdate",
      "entrydate",
      "arrivaldate",
      "arrivedate",
      "checkindate",
      "startdate",
      "begindate",
    ],
    enteredTime: [
      "timein",
      "intime",
      "entertime",
      "entrytime",
      "arrivaltime",
      "checkintime",
      "starttime",
      "begintime",
    ],
    exitedDate: [
      "dateout",
      "outdate",
      "leavedate",
      "exitdate",
      "departuredate",
      "checkoutdate",
      "enddate",
      "finishdate",
    ],
    exitedTime: [
      "timeout",
      "outtime",
      "leavetime",
      "exittime",
      "departuretime",
      "checkouttime",
      "endtime",
      "finishtime",
    ],
  } as const;
  const directionPattern = (direction: "in" | "out") =>
    direction === "in"
      ? /(enter|entry|arriv|check.?in|start|begin|(^|_)in($|_))/i
      : /(leave|exit|depart|check.?out|end|finish|(^|_)out($|_))/i;
  const findValue = (field: keyof typeof aliases): unknown => {
    const known = entries.find((entry) =>
      aliases[field].includes(entry.normalized as never),
    );
    if (known) return known.value;
    const isDate = field.endsWith("Date");
    const direction = field.startsWith("entered") ? "in" : "out";
    const candidate = entries.find(
      (entry) =>
        directionPattern(direction).test(entry.key) &&
        (isDate
          ? /date|day/i.test(entry.key)
          : /time/i.test(entry.key) && !/datetime|timestamp/i.test(entry.key)),
    );
    if (candidate) return candidate.value;
    return entries.find(
      (entry) =>
        directionPattern(direction).test(entry.key) &&
        /datetime|timestamp/i.test(entry.key),
    )?.value;
  };
  const text = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : typeof value === "string" || typeof value === "number"
        ? String(value).trim()
        : "";
  const datePart = (value: unknown) =>
    text(value).match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
  const timePart = (value: unknown) => {
    const match = text(value).match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    return match
      ? `${match[1]!.padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`
      : null;
  };
  const enteredDateValue = findValue("enteredDate");
  const enteredTimeValue = findValue("enteredTime");
  const exitedDateValue = findValue("exitedDate");
  const exitedTimeValue = findValue("exitedTime");
  return {
    teamEnteredDate: datePart(enteredDateValue) ?? datePart(enteredTimeValue),
    teamEnteredTime: timePart(enteredTimeValue) ?? timePart(enteredDateValue),
    teamExitedDate: datePart(exitedDateValue) ?? datePart(exitedTimeValue),
    teamExitedTime: timePart(exitedTimeValue) ?? timePart(exitedDateValue),
  };
}

function required(
  name: "HOSXP_HOST" | "HOSXP_USER" | "HOSXP_PASSWORD" | "HOSXP_DATABASE",
): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is required for HOSxP`);
  return value;
}

function pool(): Pool {
  if (globalHosxp.hosxpPool && globalHosxp.hosxpPoolVersion === POOL_VERSION)
    return globalHosxp.hosxpPool;
  const previous = globalHosxp.hosxpPool;
  globalHosxp.hosxpPool = undefined;
  globalHosxp.hosxpPoolVersion = undefined;
  if (previous) void previous.end().catch(() => undefined);
  const port = env.HOSXP_PORT;
  const result = createPool({
    host: required("HOSXP_HOST"),
    port,
    user: required("HOSXP_USER"),
    password: required("HOSXP_PASSWORD"),
    database: required("HOSXP_DATABASE"),
    connectionLimit: 3,
    connectTimeout: 5000,
    acquireTimeout: 5000,
    dateStrings: true,
    allowPublicKeyRetrieval: true,
  });
  globalHosxp.hosxpPool = result;
  globalHosxp.hosxpPoolVersion = POOL_VERSION;
  return result;
}

async function readOnlyQuery(
  sql: string,
  values: (string | number)[] = [],
): Promise<HosxpRow[]> {
  const currentPool = pool();
  let connection;
  try {
    connection = await currentPool.getConnection();
  } catch {
    if (globalHosxp.hosxpPool === currentPool) {
      globalHosxp.hosxpPool = undefined;
      globalHosxp.hosxpPoolVersion = undefined;
    }
    void currentPool.end().catch(() => undefined);
    throw new Error("Could not acquire a HOSxP connection");
  }
  let started = false;
  let safeToRelease = true;
  try {
    await connection.query("START TRANSACTION READ ONLY");
    started = true;
    return (await connection.query(sql, values)) as HosxpRow[];
  } finally {
    try {
      if (started) await connection.rollback();
    } catch {
      safeToRelease = false;
      connection.destroy();
      throw new Error("Could not close the read-only HOSxP transaction");
    } finally {
      if (safeToRelease) await connection.release();
    }
  }
}

/** Server-only. Callers must authorize access and protect the returned patient data. */
export async function getHosxpOperationsForDay(
  day: string,
): Promise<HosxpRow[]> {
  const [start, end] = dayRange(day);
  return getHosxpOperationsForRange(start, end);
}

/** Server-only monthly read used by the department register browser. */
export async function getHosxpOperationsForMonth(
  month: string,
): Promise<HosxpRow[]> {
  const [start, end] = monthRange(month);
  return getHosxpOperationsForRange(start, end);
}

/** Server-only list of operating rooms. HOSxP remains the read-only source. */
export async function getHosxpOperatingRooms(): Promise<
  { id: string; name: string }[]
> {
  const rows = await readOnlyQuery(
    "SELECT room_id, room_name FROM operation_room ORDER BY room_id",
  );
  return rows.flatMap((row) => {
    const id = row.room_id == null ? "" : String(row.room_id).trim();
    const name = typeof row.room_name === "string" ? row.room_name.trim() : "";
    return id && name ? [{ id, name }] : [];
  });
}

async function getHosxpOperationsForRange(
  start: string,
  end: string,
): Promise<HosxpRow[]> {
  return readOnlyQuery(operationsForDaySql, [start, end]);
}

/** Read source rows for a validated date range in one read-only query. */
export async function getHosxpOperationsForDateRange(
  start: string,
  end: string,
): Promise<HosxpRow[]> {
  return getHosxpOperationsForRange(start, end);
}

/** Read only the room and operation keys required for aggregate utilization reports. */
export async function getHosxpOperationRoomScheduleForRange(
  start: string,
  end: string,
): Promise<HosxpRow[]> {
  return readOnlyQuery(
    "SELECT operation_id, room_id, request_operation_date FROM operation_list WHERE request_operation_date >= ? AND request_operation_date < ? ORDER BY request_operation_date, operation_id",
    [start, end],
  );
}

/** Read de-identified HOSxP facts for operational reports; never selects patient identifiers or diagnoses. */
export async function getHosxpOperationAnalyticsForRange(
  start: string,
  end: string,
): Promise<HosxpRow[]> {
  return readOnlyQuery(operationAnalyticsForRangeSql, [start, end]);
}

export type HosxpPosition = {
  positionId: number;
  positionName: string;
  group: number | null;
};

/** Read the position names from HOSxP and attach the hospital's group mapping. */
export async function getHosxpPositions(): Promise<HosxpPosition[]> {
  const rows = await readOnlyQuery(
    "SELECT position_id, position_name FROM operation_position ORDER BY position_id",
  );
  return rows.map((row) => {
    if (
      typeof row.position_id !== "number" ||
      typeof row.position_name !== "string"
    ) {
      throw new Error("Unexpected operation_position row from HOSxP");
    }
    return {
      positionId: row.position_id,
      positionName: row.position_name,
      group: personnelGroupForPosition(row.position_id),
    };
  });
}

/** Server-only. Callers must authorize access and protect returned patient data. */
export async function getHosxpOperationTeam(
  operationId: number,
): Promise<HosxpRow[]> {
  if (!Number.isSafeInteger(operationId) || operationId < 1)
    throw new Error("Invalid operation ID");
  const rows = await readOnlyQuery(
    `
    SELECT t.*, dt.NAME AS doctor_name, op.position_name, oi.NAME AS operation_item_name
    FROM operation_team t
      LEFT JOIN operation_detail d ON d.operation_detail_id = t.operation_detail_id
      LEFT JOIN doctor dt ON dt.CODE = t.doctor
      LEFT JOIN operation_position op ON op.position_id = t.position_id
      LEFT JOIN operation_item oi ON oi.operation_item_id = d.operation_item_id
    WHERE t.operation_id = ?
    ORDER BY t.operation_detail_id, t.position_id`,
    [operationId],
  );
  return rows.map((row) => ({
    ...row,
    ...teamAttendance(row),
    personnelGroup: Number.isSafeInteger(Number(row.position_id))
      ? personnelGroupForPosition(Number(row.position_id))
      : null,
  }));
}

/** Read only the distinct procedure names for one operation. */
export async function getHosxpOperationItems(
  operationId: number,
): Promise<string[]> {
  if (!Number.isSafeInteger(operationId) || operationId < 1)
    throw new Error("Invalid operation ID");
  const rows = await readOnlyQuery(
    `SELECT oi.NAME AS operation_item_name
     FROM operation_detail d
       LEFT JOIN operation_item oi ON oi.operation_item_id = d.operation_item_id
     WHERE d.operation_id = ?
     GROUP BY oi.operation_item_id, oi.NAME
     ORDER BY MIN(d.operation_detail_id)`,
    [operationId],
  );
  return rows.flatMap((row) =>
    typeof row.operation_item_name === "string" &&
    row.operation_item_name.trim()
      ? [row.operation_item_name.trim()]
      : [],
  );
}

/** Read new operation orders for the outbound set-OR notice. HOSxP remains read-only. */
export async function getHosxpNewOperationRequests(
  fromAt: string,
  fromOperationId: string,
  throughAt: string,
): Promise<HosxpRow[]> {
  return getHosxpOperationRequestRows(
    `(
      CONCAT(DATE_FORMAT(o.request_date, '%Y-%m-%d'), ' ', COALESCE(o.request_time, '00:00:00')) > ?
      OR (
        CONCAT(DATE_FORMAT(o.request_date, '%Y-%m-%d'), ' ', COALESCE(o.request_time, '00:00:00')) = ?
        AND o.operation_id > ?
      )
    )
      AND CONCAT(DATE_FORMAT(o.request_date, '%Y-%m-%d'), ' ', COALESCE(o.request_time, '00:00:00')) <= ?`,
    [fromAt, fromAt, fromOperationId, throughAt],
    "o.request_date, o.request_time, o.operation_id",
  );
}

/** Poll new inserts by the HOSxP auto-increment key so delayed commits cannot fall behind a time cursor. */
export async function getHosxpOperationRequestsAfterId(
  operationId: string,
): Promise<HosxpRow[]> {
  return getHosxpOperationRequestRows(
    "o.operation_id > ?",
    [operationId],
    "o.operation_id ASC",
  );
}

/** Highest HOSxP operation key used once to establish the notification baseline. */
export async function getHosxpMaxOperationId(): Promise<string> {
  const rows = await readOnlyQuery(
    "SELECT COALESCE(MAX(operation_id), 0) AS max_operation_id FROM operation_list",
  );
  return String(rows[0]?.max_operation_id ?? "0");
}

async function getHosxpOperationRequestRows(
  where: string,
  values: (string | number)[],
  orderBy: string,
): Promise<HosxpRow[]> {
  const [preopColumnRows, screenColumnRows] = await Promise.all([
    readOnlyQuery(
      `SELECT COLUMN_NAME AS column_name
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_screen'`,
    ),
    readOnlyQuery(
      `SELECT COLUMN_NAME AS column_name
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operation_screen_in'`,
    ),
  ]);
  const availableColumns = (rows: HosxpRow[]) => rows.flatMap((row) =>
    typeof row.column_name === "string" ? [row.column_name] : [],
  );
  const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const screenFields: Array<[string, string, string[]]> = [
    ["operation_screen", "preop_npo_date", ["npodatetime", "npodate"]],
    ["operation_screen", "preop_npo_time", ["npotime"]],
    ["operation_screen", "preop_on_call", ["oncall", "oncallflag", "oncallstatus", "isoncall", "operationoncall"]],
    ["operation_screen_in", "screen_note", ["note", "remark", "operationnote", "operationremark", "screenremark", "preopnote"]],
  ];
  const screenSelect = screenFields.flatMap(([table, alias, candidates]) => {
    const columns = availableColumns(
      table === "operation_screen"
        ? preopColumnRows
        : screenColumnRows,
    );
    const column = columns.find((name) => candidates.includes(normalized(name)));
    return column && /^[A-Za-z0-9_$]+$/.test(column)
      ? [`${table === "operation_screen" ? "preop" : "screen"}.\`${column}\` AS \`${alias}\``]
      : [];
  });
  const selectScreenFields = screenSelect.length ? `${screenSelect.join(", ")},` : "";
  return readOnlyQuery(
    `SELECT ${selectScreenFields}
            opd.bw AS opdscreen_weight,
            opd.height AS opdscreen_height,
            o.*,
            DATE_FORMAT(o.request_date, '%Y-%m-%d') AS request_day,
            DATE_FORMAT(CONCAT(o.request_date, ' ', COALESCE(o.request_time, '00:00:00')), '%Y-%m-%d %H:%i:%s') AS request_timestamp,
            CONCAT(pt.pname, pt.fname, ' ', pt.lname) AS patient_name,
            w.NAME AS ward_name, d.NAME AS request_doctor_name,
            sp.NAME AS department_name,
            otn.operation_time_type_name,
            items.operation_names,
            items.operation_started_at,
            items.operation_ended_at
     FROM operation_list o
       LEFT JOIN patient pt ON pt.hn = o.hn
       LEFT JOIN operation_screen preop ON preop.operation_id = o.operation_id
       LEFT JOIN operation_screen_in screen ON screen.operation_id = o.operation_id
       LEFT JOIN doctor d ON d.CODE = o.request_doctor
       LEFT JOIN (SELECT an, MIN(ward) AS ward FROM ipt GROUP BY an) t ON t.an = o.an
       LEFT JOIN ward w ON w.ward = t.ward
       LEFT JOIN spclty sp ON sp.spclty = o.spclty
       LEFT JOIN operation_time_type otn ON otn.operation_time_type_id = o.operation_time_type_id
       LEFT JOIN opdscreen opd ON opd.vn = o.vn
       LEFT JOIN (
         SELECT od.operation_id,
                GROUP_CONCAT(DISTINCT oi.NAME ORDER BY od.operation_detail_id SEPARATOR '\\n') AS operation_names,
                COALESCE(
                  MIN(CASE WHEN TIME(od.begin_datetime) <> '00:00:00' THEN od.begin_datetime END),
                  MIN(od.begin_datetime)
                ) AS operation_started_at,
                COALESCE(
                  MAX(CASE WHEN TIME(od.end_datetime) <> '00:00:00' THEN od.end_datetime END),
                  MAX(od.end_datetime)
                ) AS operation_ended_at
         FROM operation_detail od
           LEFT JOIN operation_item oi ON oi.operation_item_id = od.operation_item_id
         GROUP BY od.operation_id
       ) items ON items.operation_id = o.operation_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT 100`,
    values,
  );
}

export async function getHosxpOperationAnesthesia(
  operationId: number,
): Promise<{
  records: HosxpRow[];
  assessment: HosxpRow | null;
  staff: HosxpRow[];
}> {
  if (!Number.isSafeInteger(operationId) || operationId < 1)
    throw new Error("Invalid operation ID");
  const [records, assessments, staff] = await Promise.all([
    readOnlyQuery(
      `SELECT a.anes_id, a.anes_type_id, t.anes_name AS anesthesia_name,
              a.begin_date_time, a.end_date_time, a.anes_note, a.df_icode, a.df_price
       FROM operation_anes a
         LEFT JOIN operation_anes_type t ON t.anes_type_id = a.anes_type_id
       WHERE a.operation_id = ?
       ORDER BY a.anes_id`,
      [operationId],
    ),
    readOnlyQuery(
      `SELECT ps.operation_anes_physical_status_name AS physical_status,
              asa.name AS asa_name, d.asa_no, d.asa_depth, d.lv_grade, d.lv_grade_sub,
              t1.name AS technique1_name, t2.name AS technique2_name,
              d.pre_op_problem, d.airway_problem, d.complication, d.anesthesiologist
       FROM operation_list o
         LEFT JOIN operation_anes_detail d ON d.operation_id = o.operation_id
         LEFT JOIN operation_anes_physical_status ps ON ps.operation_anes_physical_status_id = o.operation_anes_physical_status_id
         LEFT JOIN operation_anes_asa asa ON asa.asa_id = d.asa_id
         LEFT JOIN operation_anes_technique t1 ON t1.technique_id = d.technique_id
         LEFT JOIN operation_anes_technique t2 ON t2.technique_id = d.techique2_id
       WHERE o.operation_id = ?
       LIMIT 1`,
      [operationId],
    ),
    readOnlyQuery(
      `SELECT a.operation_anes_doctor_id, a.anes_id, a.doctor,
              dt.NAME AS doctor_name,
              COALESCE(NULLIF(p.operation_anes_doctor_position_name, ''), NULLIF(lp.anes_dct_pos_name, '')) AS position_name
       FROM operation_anes_doctor a
         LEFT JOIN doctor dt ON dt.CODE = a.doctor
         LEFT JOIN operation_anes_doctor_position p ON p.operation_anes_doctor_position_id = a.operation_anes_doctor_position_id
         LEFT JOIN operation_anes_dct_pos lp ON lp.anes_dct_pos_id = a.anes_dct_pos_id
       WHERE a.operation_id = ?
       ORDER BY a.operation_anes_doctor_id`,
      [operationId],
    ),
  ]);
  return { records, assessment: assessments[0] ?? null, staff };
}

/** Read teams for a daily export in one read-only query instead of one query per operation. */
export async function getHosxpOperationTeams(
  operationIds: number[],
): Promise<HosxpRow[]> {
  const ids = [...new Set(operationIds)];
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1))
    throw new Error("Invalid operation IDs");
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await readOnlyQuery(
    `SELECT t.*, dt.NAME AS doctor_name, op.position_name, oi.NAME AS operation_item_name
     FROM operation_team t
       LEFT JOIN operation_detail d ON d.operation_detail_id = t.operation_detail_id
       LEFT JOIN doctor dt ON dt.CODE = t.doctor
       LEFT JOIN operation_position op ON op.position_id = t.position_id
       LEFT JOIN operation_item oi ON oi.operation_item_id = d.operation_item_id
     WHERE t.operation_id IN (${placeholders})
     ORDER BY t.operation_id, t.operation_detail_id, t.position_id`,
    ids,
  );
  return rows.map((row) => ({
    ...row,
    ...teamAttendance(row),
    personnelGroup: Number.isSafeInteger(Number(row.position_id))
      ? personnelGroupForPosition(Number(row.position_id))
      : null,
  }));
}
