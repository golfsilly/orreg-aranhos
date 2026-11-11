import "server-only";

type HosxpOperation = Record<string, unknown>;

const valueText = (value: unknown) =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
        .replace(/[\r\n\t]+/g, " ")
        .trim()
    : "";

function normalizedEntries(row: HosxpOperation) {
  return Object.entries(row).map(([key, value]) => ({
    key: key
      .toLowerCase()
      .replace(/^(screen|preop)[_]?/, "")
      .replace(/[^a-z0-9]/g, ""),
    value,
  }));
}

function firstValue(row: HosxpOperation, names: string[]) {
  const entries = normalizedEntries(row);
  for (const name of names) {
    const entry = entries.find(
      (item) => item.key === name.toLowerCase().replace(/[^a-z0-9]/g, ""),
    );
    const value = valueText(entry?.value);
    if (value) return value;
  }
  return "";
}

function field(row: HosxpOperation, names: string[]) {
  return firstValue(row, names) || "-";
}

function thaiDate(value: unknown) {
  const text = valueText(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match
    ? `${match[3]}/${match[2]}/${Number(match[1]) + 543}`
    : text || "-";
}

function time(value: unknown) {
  const text = valueText(value);
  const match = text.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  return match ? `${match[1]!.padStart(2, "0")}:${match[2]}` : text || "-";
}

function oneOperationMessage(row: HosxpOperation) {
  const requestTimestamp = firstValue(row, ["request_timestamp"]);
  const requestTime = firstValue(row, ["request_time"]);
  const operationTime = firstValue(row, ["operation_time"]);
  const operationTimeType = firstValue(row, ["operation_time_type_name"]);
  const operation = firstValue(row, ["operation_name", "operation_names"]);
  const diagnosis = firstValue(row, [
    "pre_diagnosis_text_list",
    "pre_diagnosis_text",
  ]);
  const npoDate = firstValue(row, [
    "npo_date_time",
    "npo_datetime",
    "npo_date",
    "npo",
  ]);
  const npoTime = firstValue(row, ["npo_time"]);
  const npo =
    npoDate && npoTime
      ? `${thaiDate(npoDate)} ${time(npoTime)}`
      : npoDate || npoTime || "-";
  const height = field(row, ["height", "ht", "height_cm", "patient_height"]);
  const weight = field(row, ["bw", "weight", "body_weight", "patient_weight"]);
  const orderDay =
    firstValue(row, ["request_day", "request_date"]) ||
    requestTimestamp.slice(0, 10);
  const orderClock = requestTime || requestTimestamp.slice(11, 19);
  const surgeryDay = firstValue(row, [
    "operation_date",
    "request_operation_date",
  ]);
  const timeLabel = operationTimeType
    ? `${time(operationTime)} (${operationTimeType})`
    : time(operationTime);
  const anesthesia = firstValue(row, ["operation_list_anes_type_id"]);
  const anesthesiaLabel = anesthesia
    ? Number(anesthesia) === 0
      ? "ไม่ใช้"
      : "ใช้"
    : "ไม่ระบุ";

  return [
    "🟨 OR-REG NOTIFICATION",
    `${thaiDate(orderDay)} · ${time(orderClock)} น.`,
    "",
    "🩺 หัตถการ / OPERATION",
    operation || "ยังไม่ระบุ",
    "",
    "📅 วันที่ผ่าตัด",
    `${thaiDate(surgeryDay)}   ·   เวลา ${timeLabel}`,
    "",
    "👤 ข้อมูลผู้ป่วย",
    `HN              ${field(row, ["hn"])}`,
    `ชื่อ-สกุล       ${field(row, ["patient_name", "fullname"])}`,
    `อายุ              ${field(row, ["age_text", "age"])}`,
    `โรคประจำตัว  ${field(row, ["chronic_disease"])}`,
    "",
    "📋 รายละเอียดการส่งผ่าตัด",
    `หน่วยงาน       ${field(row, ["ward_name"])}`,
    `การวินิจฉัย   ${diagnosis || "-"}`,
    `เวลา NPO       ${npo}`,
    // `น้ำหนัก          ${weight === "-" ? "-" : `${weight} กก.`}`,
    // `ส่วนสูง          ${height === "-" ? "-" : `${height} ซม.`}`,
    `แพทย์             ${field(row, ["request_doctor_name"])}`,
    `ดมยาสลบ       ${anesthesiaLabel}`,
  ]
    .join("\n")
    .slice(0, 3500);
}

export async function sendSetOrMessages(rows: HosxpOperation[]) {
  const messages = rows.map((row) => ({
    text: oneOperationMessage(row),
    type: "text",
  }));
  const { env } = await import("@/lib/env");
  const response = await fetch(env.MOPH_NOTIFY_API_URL, {
    method: "POST",
    headers: {
      "client-key": env.MOPH_NOTIFY_GROUP_CLIENT_KEY!,
      "secret-key": env.MOPH_NOTIFY_GROUP_SECRET_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("MOPH_NOTIFY_FAILED");
}
