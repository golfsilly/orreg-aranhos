import { BRAND } from "@/lib/brand";
import "server-only";
import { assertSetOrResponse, SetOrNotificationError } from "./set-or-response";
export {
  SetOrNotificationError,
  type SetOrNotificationErrorCode,
} from "./set-or-response";

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

function detailRow(label: string, value: string, emphasized = false) {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      flexText(label, { flex: 3, size: "sm", color: "#52665D" }),
      flexText(value || "-", {
        flex: 5,
        size: "sm",
        align: "start",
        ...(emphasized ? { weight: "bold" } : {}),
      }),
    ],
  };
}

function summaryField(label: string, value: string, redBadge = false) {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    spacing: "xs",
    contents: [
      flexText(label, { size: "sm", color: "#52665D" }),
      redBadge
        ? {
            type: "box",
            layout: "vertical",
            width: "60px",
            backgroundColor: "#FFF1F2",
            cornerRadius: "12px",
            paddingAll: "4px",
            contents: [flexText(value, {
              size: "sm", weight: "bold", align: "center", color: "#B42318",
            })],
          }
        : flexText(value || "-", { size: "sm", weight: "bold" }),
    ],
  };
}

function clinicalNote(label: string, value: string, emphasized = false, color?: string) {
  return {
    type: "box",
    layout: "vertical",
    spacing: "xs",
    contents: [
      flexText(label, { size: "sm", color: "#52665D" }),
      flexText(value || "-", {
        size: emphasized ? "md" : "sm",
        ...(emphasized ? { weight: "bold" } : {}),
        ...(color && value.trim() && value.trim() !== "-" ? { color } : {}),
      }),
    ],
  };
}

function procedureItems(row: HosxpOperation) {
  const requested = Array.isArray(row.requested_procedures)
    ? row.requested_procedures.flatMap((item: unknown) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const procedure = item as HosxpOperation;
        const name = firstValue(procedure, ["operation_name"]);
        return name
          ? [
              {
                name,
                position: firstValue(procedure, ["operation_position"]),
                side: firstValue(procedure, ["operation_side"]),
              },
            ]
          : [];
      })
    : [];
  if (requested.length) return requested;

  const names = firstMultilineValue(row, ["operation_names", "operation_name"])
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  return names.map((name) => ({
    name,
    // A case-level location must never be copied onto several procedures.
    position: names.length === 1 ? firstValue(row, ["operation_position"]) : "",
    side: names.length === 1 ? firstValue(row, ["operation_side"]) : "",
  }));
}

function oneOperationMessage(row: HosxpOperation, logoUrl?: string) {
  const requestTimestamp = firstValue(row, ["request_timestamp"]);
  const requestTime = firstValue(row, ["request_time"]);
  const operationTime = firstValue(row, ["operation_time"]);
  const operationItems = procedureItems(row);
  const operation = operationItems.map((item) => item.name).join(", ");
  const sourceChronicDisease = firstValue(row, ["chronic_disease"]);
  const chronicDisease =
    sourceChronicDisease && sourceChronicDisease !== "-"
      ? sourceChronicDisease
      : "ปฏิเสธ";
  const sourceDrugAllergy = firstValue(row, ["patient_drug_allergy"]);
  const drugAllergy =
    sourceDrugAllergy && sourceDrugAllergy !== "-"
      ? sourceDrugAllergy
      : "ไม่มีข้อมูลการแพ้ยา";
  const sourceBedNumber = firstValue(row, ["patient_bed_number"]);
  const bedNumber =
    sourceBedNumber === "-" || sourceBedNumber === "ไม่ระบุ"
      ? ""
      : sourceBedNumber;
  const anesthesiaTypeId = firstValue(row, ["operation_list_anes_type_id"]);
  // Zero is a real HOSxP choice: anesthesia is used, but its type is unknown.
  const usesAnesthesia = /^\d+$/.test(anesthesiaTypeId);
  const anesthesiaHighlight = usesAnesthesia ? "#B42318" : undefined;
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
  const scheduledClock = time(scheduledOperationTime || operationTime);
  // Register display policy: treat a zero scheduled clock as unspecified here.
  const timeLabel =
    scheduledClock === "00:00" || scheduledClock === "-"
      ? "ไม่ระบุ"
      : scheduledClock;
  // HOSxP's Dx. Note and remarks are separate clinical fields. Never infer
  // a diagnosis from remarks entered before staff started using Dx. Note.
  const diagnosis = firstMultilineValue(row, ["dx_note"]);
  const operationNote = firstMultilineValue(row, [
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
  const isOnCall = ["1", "true", "yes", "y", "on", "on call"].includes(
    onCallValue,
  );
  // Keep ON CALL together when a narrow messaging client wraps the time.
  const onCallLabel = "ON\u00A0CALL";
  const operationTimeLabel = isOnCall
    ? timeLabel === "ไม่ระบุ"
      ? onCallLabel
      : `${timeLabel} · ${onCallLabel}`
    : timeLabel;
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
        backgroundColor: "#103F35",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            alignItems: "center",
            contents: [
              {
                type: "box",
                layout: "vertical",
                width: "36px",
                height: "36px",
                cornerRadius: "10px",
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                contents: [logo],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  flexText(BRAND.wordmark, {
                    size: "sm",
                    weight: "bold",
                    color: "#BCD5CC",
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
            size: "md",
            weight: "bold",
            color: "#FFFFFF",
            margin: "sm",
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
        spacing: "xs",
        paddingAll: "14px",
        backgroundColor: "#FFFFFF",
        contents: [
          flexText("หัตถการผ่าตัด", {
            size: "sm",
            color: "#52665D",
            weight: "bold",
          }),
          ...(operationItems.length
            ? operationItems.map((item) => ({
                type: "box",
                layout: "vertical",
                spacing: "xs",
                contents: [
                  flexText(`• ${item.name}`, {
                    size: "md",
                    color: item.name !== "-" && anesthesiaHighlight ? anesthesiaHighlight : "#0B5A4B",
                    weight: "bold",
                  }),
                  ...([item.position, item.side].some(
                    (value) => value && value !== "-",
                  )
                    ? [
                        flexText(
                          [
                            item.position && item.position !== "-"
                              ? `ตำแหน่ง: ${item.position}`
                              : "",
                            item.side && item.side !== "-"
                              ? `ด้าน: ${item.side}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · "),
                          { size: "sm", color: "#52665D" },
                        ),
                      ]
                    : []),
                ],
              }))
            : [flexText("• ยังไม่ระบุ", { size: "md", color: "#52665D" })]),
          {
            type: "separator",
            margin: "md",
            color: "#E3E9E6",
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            backgroundColor: "#F3F6F4",
            cornerRadius: "10px",
            paddingAll: "10px",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                paddingAll: "6px",
                contents: [
                  flexText("วันที่ผ่าตัด", {
                    size: "sm",
                    color: "#52665D",
                  }),
                  flexText(thaiDate(surgeryDay), {
                    size: "md",
                    weight: "bold",
                    margin: "xs",
                  }),
                ],
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                paddingAll: "6px",
                contents: [
                  flexText("เวลาผ่าตัด", {
                    size: "sm",
                    color: "#52665D",
                  }),
                  flexText(operationTimeLabel, {
                    size: "md",
                    weight: "bold",
                    margin: "xs",
                    color: isOnCall ? "#B42318" : "#263A35",
                  }),
                ],
                ...(isOnCall
                  ? {
                      backgroundColor: "#FFF1F2",
                      cornerRadius: "10px",
                    }
                  : {}),
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F6F8F7",
            cornerRadius: "10px",
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              flexText("ข้อมูลผู้ป่วย", {
                size: "sm",
                color: "#0B5A4B",
                weight: "bold",
              }),
              clinicalNote(
                "ชื่อ-สกุล",
                field(row, ["patient_name", "fullname"]),
                true,
                anesthesiaHighlight,
              ),
              detailRow("HN", field(row, ["hn"]), true),
              detailRow("อายุ", field(row, ["age_text", "age"])),
              detailRow("โรคประจำตัว", chronicDisease),
              detailRow("การแพ้ยา", drugAllergy),
            ],
          },
          flexText("รายละเอียดการส่งผ่าตัด", {
            size: "sm",
            color: "#0B5A4B",
            weight: "bold",
            margin: "md",
          }),
          detailRow("แผนก", field(row, ["department_name", "spclty_name"])),
          clinicalNote("Ward", field(row, ["ward_name"])),
          ...(bedNumber ? [detailRow("เตียง", bedNumber)] : []),
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              summaryField("น้ำหนัก", weight === "-" ? "-" : `${weight} กก.`),
              summaryField("ส่วนสูง", height === "-" ? "-" : `${height} ซม.`),
            ],
          },
          clinicalNote("แพทย์", field(row, ["request_doctor_name"])),
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              summaryField("เวลา NPO", npo),
              summaryField("ดมยาสลบ", usesAnesthesia ? "ใช้" : "ไม่ใช้", usesAnesthesia),
            ],
          },
          { type: "separator", margin: "sm", color: "#E3E9E6" },
          clinicalNote("Dx.", diagnosis, false, anesthesiaHighlight),
          clinicalNote("หมายเหตุ", operationNote),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        backgroundColor: "#F6F8F7",
        contents: [
          flexText(`${BRAND.wordmark} · ${BRAND.hospitalName}`, {
            size: "xs",
            color: "#63766F",
            align: "center",
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
  let response: Response;
  try {
    response = await fetch(env.MOPH_NOTIFY_API_URL, {
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
  } catch {
    throw new SetOrNotificationError("NETWORK_OR_TIMEOUT");
  }

  const result: unknown = await response.json().catch(() => null);
  assertSetOrResponse(result, response.status);
}
