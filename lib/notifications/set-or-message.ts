import { BRAND } from "@/lib/brand";
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

function firstMultilineValue(row: HosxpOperation, names: string[]) {
  const entries = Object.entries(row).map(([key, value]) => ({
    key: key.toLowerCase().replace(/[^a-z0-9]/g, ""),
    value,
  }));
  for (const name of names) {
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const value = entries.find((entry) => entry.key === key)?.value;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).replace(/\r/g, "").replace(/\t/g, " ").trim();
      if (text) return text;
    }
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

function flexText(
  text: string,
  options: Record<string, string | number | boolean> = {},
) {
  return {
    type: "text",
    text,
    size: "sm",
    color: "#263A35",
    wrap: true,
    ...options,
  };
}

function detailRow(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "md",
    contents: [
      flexText(label, { flex: 3, color: "#71817A" }),
      flexText(value || "-", {
        flex: 5,
        align: "end",
        weight: "bold",
      }),
    ],
  };
}

function oneOperationMessage(row: HosxpOperation, logoUrl?: string) {
  const requestTimestamp = firstValue(row, ["request_timestamp"]);
  const requestTime = firstValue(row, ["request_time"]);
  const operationTime = firstValue(row, ["operation_time"]);
  const operationNames = firstMultilineValue(row, [
    "operation_names",
    "operation_name",
  ]);
  const operationItems = operationNames
    .split(/\r?\n|,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  const operation = operationItems.join(", ");
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
  const height = field(row, [
    "opdscreen_height",
    "height",
    "ht",
    "height_cm",
    "patient_height",
  ]);
  const weight = field(row, [
    "opdscreen_weight",
    "bw",
    "weight",
    "body_weight",
    "patient_weight",
  ]);
  const orderDay =
    firstValue(row, ["request_day", "request_date"]) ||
    requestTimestamp.slice(0, 10);
  const orderClock = requestTime || requestTimestamp.slice(11, 19);
  const surgeryDay = firstValue(row, [
    "request_operation_date",
    "operation_date",
  ]);
  const scheduledOperationTime = firstValue(row, [
    "request_operation_time",
    "operation_request_time",
    "operation_time",
  ]);
  const timeLabel = time(scheduledOperationTime || operationTime);
  const operationNote = firstValue(row, [
    "screen_note",
    "screen_remark",
    "preop_note",
    "operation_note",
    "operation_remark",
    "remark",
    "note",
    "set_note",
    "note_operation",
    "pre_op_note",
  ]);
  const onCallValue = firstValue(row, [
    "preop_on_call",
    "on_call",
    "oncall",
    "is_on_call",
    "is_oncall",
    "on_call_status",
    "on_call_flag",
    "operation_on_call",
    "operation_call",
  ]).toLowerCase();
  const onCallLabel = ["1", "true", "yes", "y", "on", "on call"].includes(
    onCallValue,
  )
    ? "On call"
    : ["0", "false", "no", "n", "off"].includes(onCallValue)
      ? "ไม่ใช่"
      : onCallValue || "ไม่ระบุ";
  const logo = logoUrl
    ? {
        type: "image",
        url: logoUrl,
        size: "full",
        aspectMode: "fit",
        aspectRatio: "1:1",
      }
    : flexText("OR", {
        size: "md",
        weight: "bold",
        color: "#0B5A4B",
        align: "center",
        gravity: "center",
      });

  return {
    type: "flex",
    altText: `แจ้งเตือนเคสผ่าตัดใหม่ ${operation || "ไม่ระบุหัตถการ"}`.slice(
      0,
      400,
    ),
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0B5A4B",
        paddingAll: "18px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            alignItems: "center",
            contents: [
              {
                type: "box",
                layout: "vertical",
                width: "42px",
                height: "42px",
                cornerRadius: "12px",
                backgroundColor: "#E4F0EA",
                justifyContent: "center",
                contents: [logo],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  flexText(`${BRAND.wordmark} / NOTIFICATION`, {
                    size: "xs",
                    weight: "bold",
                    color: "#D7C58A",
                  }),
                  flexText(BRAND.hospitalName, {
                    size: "sm",
                    weight: "bold",
                    color: "#FFFFFF",
                  }),
                ],
              },
            ],
          },
          flexText("แจ้งเตือนเคสผ่าตัดใหม่", {
            size: "lg",
            weight: "bold",
            color: "#FFFFFF",
            margin: "lg",
          }),
          flexText(`${thaiDate(orderDay)} · ${time(orderClock)} น.`, {
            size: "xs",
            color: "#D8E8E2",
            margin: "xs",
          }),
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "18px",
        contents: [
          flexText("รายการหัตถการ / OPERATION", {
            size: "xs",
            color: "#71817A",
            weight: "bold",
          }),
          ...(operationItems.length
            ? operationItems.map((item) =>
                flexText(`• ${item}`, {
                  size: "sm",
                  color: "#0B5A4B",
                  weight: "bold",
                }),
              )
            : [flexText("• ยังไม่ระบุ", { size: "sm", color: "#71817A" })]),
          {
            type: "separator",
            margin: "sm",
            color: "#E2EAE5",
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  flexText("วันที่ผ่าตัด", {
                    size: "xs",
                    color: "#71817A",
                  }),
                  flexText(thaiDate(surgeryDay), {
                    weight: "bold",
                    margin: "xs",
                  }),
                ],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  flexText("เวลาผ่าตัด", {
                    size: "xs",
                    color: "#71817A",
                  }),
                  flexText(timeLabel, { weight: "bold", margin: "xs" }),
                ],
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F1F6F3",
            cornerRadius: "12px",
            paddingAll: "14px",
            spacing: "sm",
            contents: [
              flexText("ข้อมูลผู้ป่วย", {
                size: "xs",
                color: "#0B5A4B",
                weight: "bold",
              }),
              detailRow("HN", field(row, ["hn"])),
              detailRow("ชื่อ-สกุล", field(row, ["patient_name", "fullname"])),
              detailRow("อายุ", field(row, ["age_text", "age"])),
              detailRow("โรคประจำตัว", field(row, ["chronic_disease"])),
            ],
          },
          flexText("รายละเอียดการส่งผ่าตัด", {
            size: "xs",
            color: "#0B5A4B",
            weight: "bold",
            margin: "sm",
          }),
          detailRow("แผนก", field(row, ["department_name", "spclty_name"])),
          detailRow("Ward", field(row, ["ward_name"])),
          detailRow("เวลา NPO", npo),
          detailRow("น้ำหนัก", weight === "-" ? "-" : `${weight} กก.`),
          detailRow("ส่วนสูง", height === "-" ? "-" : `${height} ซม.`),
          detailRow("แพทย์", field(row, ["request_doctor_name"])),
          detailRow("On call", onCallLabel),
          detailRow("หมายเหตุ", operationNote || "-"),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          { type: "separator", color: "#E2EAE5" },
          flexText(`${BRAND.wordmark} · ${BRAND.hospitalName}`, {
            size: "xs",
            color: "#71817A",
            align: "center",
            margin: "md",
          }),
        ],
      },
    },
  };
}

export async function sendSetOrMessages(rows: HosxpOperation[]) {
  const { env } = await import("@/lib/env");
  const messages = rows.map((row) =>
    oneOperationMessage(row, env.MOPH_NOTIFY_ORREG_LOGO_URL),
  );
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

  const result = (await response.json().catch(() => null)) as {
    message_code?: number | string;
  } | null;
  if (!response.ok || Number(result?.message_code) !== 200)
    throw new Error("MOPH_NOTIFY_FAILED");
}
