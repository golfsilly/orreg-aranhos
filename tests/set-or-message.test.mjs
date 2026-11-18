import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../lib/notifications/set-or-message.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
const dependencies = { "@/lib/brand": { BRAND: { wordmark: "OR-REG", hospitalName: "Test Hospital" } }, "server-only": {}, "./set-or-response": {} };
new Function("require", "module", "exports", `${code}\nmodule.exports.render = oneOperationMessage;`)((id) => {
  if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`);
  return dependencies[id];
}, mod, mod.exports);

function textAfterLabel(card, label) {
  const pending = [card.contents];
  while (pending.length) {
    const node = pending.shift();
    for (const children of [node.contents, node.header?.contents, node.body?.contents, node.footer?.contents]) {
      if (!children) continue;
      const index = children.findIndex((child) => child.text === label);
      if (index !== -1) {
        let value = children[index + 1];
        while (value?.contents?.length) value = value.contents[0];
        return value?.text;
      }
      pending.push(...children);
    }
  }
  throw new Error(`Missing notification field ${label}`);
}

function allTextNodes(card) {
  const texts = [];
  const visit = (node) => {
    if (node.type === "text") texts.push(node);
    node.contents?.forEach(visit);
  };
  for (const section of [card.contents.header, card.contents.body, card.contents.footer]) visit(section);
  return texts;
}

test("selected anesthesia highlights patient name, every procedure name, Dx. Note and the used badge", () => {
  for (const selected of [0, "0", " 0 ", 1, "2", 3, "4"]) {
    const row = {
      operation_list_anes_type_id: selected,
      patient_name: "Synthetic patient name", dx_note: "Synthetic Dx. A\nSynthetic Dx. B",
      note: "Synthetic remarks", preop_on_call: "Y", request_operation_time: "14:00:00",
      requested_procedures: [
        { operation_name: "Synthetic procedure A", operation_position: "BREAST", operation_side: "ขวา" },
        { operation_name: "Synthetic procedure B", operation_position: "ARM", operation_side: "ซ้าย" },
      ],
    };
    const before = structuredClone(row);
    const card = mod.exports.render(row);
    const texts = allTextNodes(card);
    assert.deepEqual(texts.filter((node) => node.color === "#B42318").map((node) => node.text).sort(), [
      "• Synthetic procedure A", "• Synthetic procedure B", row.patient_name, row.dx_note, "ใช้",
    ].sort());
    assert.equal(texts.find((node) => node.text === "14:00 · ON\u00A0CALL").color, "#92400E");
    for (const label of ["ชื่อ-สกุล", "หัตถการผ่าตัด", "หมายเหตุ"])
      assert.notEqual(texts.find((node) => node.text === label).color, "#B42318");
    assert.equal(textAfterLabel(card, "ดมยาสลบ"), "ใช้");
    assert.throws(() => textAfterLabel(card, "Dx."), /Missing notification field/);
    assert.deepEqual(row, before);
  }
});

test("unselected anesthesia preserves normal colors even when on-call is selected", () => {
  for (const selected of [undefined, null, "", "  ", "-", -1, "unknown"]) {
    const card = mod.exports.render({
      operation_list_anes_type_id: selected, require_anes: "Y", preop_on_call: "Y",
      patient_name: "Synthetic patient", dx_note: "Synthetic Dx.",
      operation_name: "Synthetic procedure", operation_position: "BREAST", operation_side: "ขวา",
    });
    const texts = allTextNodes(card);
    assert.deepEqual(texts.filter((node) => node.color === "#92400E").map((node) => node.text), ["ON\u00A0CALL"]);
    assert.equal(texts.find((node) => node.text === "• Synthetic procedure").color, "#0B5A4B");
    assert.equal(textAfterLabel(card, "ดมยาสลบ"), "ไม่ใช้");
  }
});

test("anesthesia does not color empty placeholders and also highlights legacy procedure names", () => {
  for (const value of [undefined, null, "", "  ", "-"]) {
    const blank = mod.exports.render({ operation_list_anes_type_id: 0, patient_name: value, dx_note: value });
    assert.equal(textAfterLabel(blank, "ชื่อ-สกุล"), "-");
    assert.throws(() => textAfterLabel(blank, "Dx."), /Missing notification field/);
    assert.deepEqual(allTextNodes(blank).filter((node) => node.color === "#B42318").map((node) => node.text), ["ใช้"]);
  }
  const card = mod.exports.render({ operation_list_anes_type_id: 1, operation_names: "Synthetic A\nSynthetic B" });
  assert.deepEqual(allTextNodes(card).filter((node) => node.color === "#B42318").map((node) => node.text), ["• Synthetic A", "• Synthetic B", "ใช้"]);
});

test("used anesthesia has a red badge while not-used remains plain text", () => {
  for (const selected of [0, "0", 1, "2", 3, "4", undefined, null, ""]) {
    const card = mod.exports.render({ operation_list_anes_type_id: selected });
    const pending = [card.contents.body];
    let badge;
    while (pending.length) {
      const node = pending.shift();
      if (node.contents?.[0]?.text === "ดมยาสลบ") { badge = node.contents[1]; break; }
      pending.push(...(node.contents ?? []));
    }
    if (selected !== undefined && selected !== null && selected !== "") {
      assert.equal(badge.type, "box");
      assert.equal(badge.backgroundColor, "#FFF1F2");
      assert.equal(badge.cornerRadius, "12px");
      assert.equal(badge.contents[0].text, "ใช้");
      assert.equal(badge.contents[0].color, "#B42318");
    } else {
      assert.equal(badge.type, "text");
      assert.equal(badge.text, "ไม่ใช้");
      assert.equal(badge.color, "#263A35");
    }
  }
});

test("notification card labels blank and zero scheduled clocks as unspecified", () => {
  for (const value of [undefined, null, "", "  ", "00:00", "00:00:00", "0:00"]) {
    const row = { request_operation_date: "2026-11-16", request_operation_time: value };
    const before = structuredClone(row);
    assert.equal(textAfterLabel(mod.exports.render(row), "เวลาผ่าตัด"), "ไม่ระบุ");
    assert.deepEqual(row, before, "formatting must not change source values");
  }
});

test("entered scheduled clocks retain their real times and source priority", () => {
  assert.equal(textAfterLabel(mod.exports.render({ request_operation_time: "09:30:00" }), "เวลาผ่าตัด"), "09:30");
  assert.equal(textAfterLabel(mod.exports.render({ operation_time: "14:15:00" }), "เวลาผ่าตัด"), "14:15");
  assert.equal(textAfterLabel(mod.exports.render({ request_operation_time: "00:00:00", operation_time: "09:30:00" }), "เวลาผ่าตัด"), "ไม่ระบุ");
});

test("the missing-schedule policy leaves the order timestamp and surgery date intact", () => {
  const card = mod.exports.render({ request_day: "2026-11-16", request_time: "00:00:00", request_operation_date: "2026-11-17", request_operation_time: "00:00:00" });
  assert.equal(textAfterLabel(card, "วันที่ผ่าตัด"), "17/11/2569");
  assert.match(card.contents.header.contents.at(-1).text, /00:00/);
  assert.equal(textAfterLabel(card, "เวลาผ่าตัด"), "ไม่ระบุ");
});

test("notification card shows the admission bed directly after Ward when present", () => {
  const row = { ward_name: "Synthetic Ward", patient_bed_number: "  A-05  " };
  const before = structuredClone(row);
  const card = mod.exports.render(row);
  assert.equal(textAfterLabel(card, "เตียง"), "A-05");
  const details = card.contents.body.contents;
  const wardIndex = details.findIndex((node) => node.contents?.[0]?.text === "Ward");
  assert.equal(details[wardIndex + 1].contents[0].text, "เตียง");
  assert.deepEqual(row, before);
});

test("notification card omits the entire bed row when the admission has no bed", () => {
  for (const value of [undefined, null, "", "  ", "-", "ไม่ระบุ"]) {
    const card = mod.exports.render({ patient_bed_number: value });
    assert.throws(() => textAfterLabel(card, "เตียง"), /Missing notification field/);
    assert.equal(textAfterLabel(card, "Ward"), "-");
  }
});

test("on-call replaces an unspecified scheduled clock and is highlighted", () => {
  for (const value of [undefined, null, "", "00:00", "00:00:00"]) {
    const card = mod.exports.render({ request_operation_time: value, preop_on_call: "Y" });
    assert.equal(textAfterLabel(card, "เวลาผ่าตัด"), "ON\u00A0CALL");
    assert.throws(() => textAfterLabel(card, "On call"), /Missing notification field/);
    const schedule = card.contents.body.contents.find((node) => node.contents?.[1]?.contents?.[0]?.text === "เวลาผ่าตัด").contents[1];
    assert.equal(schedule.contents[1].color, "#92400E");
    assert.equal(schedule.backgroundColor, "#FFFBEB");
  }
});

test("on-call follows an entered scheduled time in the same highlighted field", () => {
  for (const selected of ["Y", "1", 1, "true", "on call"]) {
    const card = mod.exports.render({ request_operation_time: "09:30:00", preop_on_call: selected });
    assert.equal(textAfterLabel(card, "เวลาผ่าตัด"), "09:30 · ON\u00A0CALL");
  }
});

test("unselected on-call leaves an entered time normal without a redundant row", () => {
  for (const selected of [undefined, null, "N", "0", 0, "false"]) {
    const card = mod.exports.render({ request_operation_time: "10:15:00", preop_on_call: selected });
    assert.equal(textAfterLabel(card, "เวลาผ่าตัด"), "10:15");
    assert.throws(() => textAfterLabel(card, "On call"), /Missing notification field/);
    const schedule = card.contents.body.contents.find((node) => node.contents?.[1]?.contents?.[0]?.text === "เวลาผ่าตัด").contents[1];
    assert.equal(schedule.contents[1].color, "#263A35");
    assert.equal(schedule.backgroundColor, undefined);
  }
});

test("every selected anesthesia type including HOSxP's valid zero choice displays used", () => {
  for (const selected of [0, "0", " 0 ", 1, "2", 3, "4"]) {
    const row = { operation_list_anes_type_id: selected };
    const before = structuredClone(row);
    assert.equal(textAfterLabel(mod.exports.render(row), "ดมยาสลบ"), "ใช้");
    assert.deepEqual(row, before);
  }
});

test("an unselected or invalid anesthesia choice keeps the row and displays not used", () => {
  for (const selected of [undefined, null, "", "  ", "-", -1, "unknown"]) {
    const card = mod.exports.render({ operation_list_anes_type_id: selected, require_anes: "Y" });
    assert.equal(textAfterLabel(card, "ดมยาสลบ"), "ไม่ใช้");
  }
});

test("notification chronic disease uses the requested display default without changing the source", () => {
  for (const value of [undefined, null, "", "  ", "-", " - "]) {
    const row = { chronic_disease: value };
    const before = structuredClone(row);
    assert.equal(textAfterLabel(mod.exports.render(row), "โรคประจำตัว"), "ปฏิเสธ");
    assert.deepEqual(row, before);
  }
  assert.equal(textAfterLabel(mod.exports.render({ chronic_disease: "Synthetic condition" }), "โรคประจำตัว"), "Synthetic condition");
});

test("drug allergy is shown in the patient section immediately after chronic disease", () => {
  const row = { chronic_disease: "Synthetic condition", patient_drug_allergy: "DEMO_DRUG_A,DEMO_DRUG_B" };
  const before = structuredClone(row);
  const card = mod.exports.render(row);
  assert.equal(textAfterLabel(card, "การแพ้ยา"), "DEMO_DRUG_A,DEMO_DRUG_B");
  const patient = card.contents.body.contents.find((node) => node.contents?.[0]?.text === "ข้อมูลผู้ป่วย");
  const chronicIndex = patient.contents.findIndex((node) => node.contents?.[0]?.text === "โรคประจำตัว");
  assert.equal(patient.contents[chronicIndex + 1].contents[0].text, "การแพ้ยา");
  assert.equal(patient.contents[chronicIndex + 1].contents[1].wrap, true);
  assert.deepEqual(row, before);
});

test("missing allergy data is not converted into a confirmed denial while explicit source statements remain unchanged", () => {
  for (const value of [undefined, null, "", "  ", "-"]) {
    assert.equal(textAfterLabel(mod.exports.render({ patient_drug_allergy: value }), "การแพ้ยา"), "ไม่มีข้อมูลการแพ้ยา");
  }
  const sourceStatement = "ปฏิเสธการแพ้ยา";
  assert.equal(textAfterLabel(mod.exports.render({ patient_drug_allergy: sourceStatement }), "การแพ้ยา"), sourceStatement);
});

test("Dx. is omitted while remarks remain visible in the compact layout", () => {
  const row = {
    operation_list_anes_type_id: 0,
    dx_note: "Synthetic diagnosis A\nSynthetic diagnosis B",
    note: "Synthetic remark only",
    provision_diagnosis_text: "Another diagnosis source",
  };
  const before = structuredClone(row);
  const card = mod.exports.render(row);
  assert.equal(textAfterLabel(card, "ดมยาสลบ"), "ใช้");
  assert.throws(() => textAfterLabel(card, "Dx."), /Missing notification field/);
  assert.equal(textAfterLabel(card, "หมายเหตุ"), "Synthetic remark only");
  const texts = [];
  const visit = (node) => {
    if (node.text) texts.push(node.text);
    if (node.type === "text") assert.equal(node.wrap, true);
    node.contents?.forEach(visit);
  };
  visit(card.contents.body);
  assert.ok(texts.indexOf("ดมยาสลบ") < texts.indexOf("หมายเหตุ"));
  assert.deepEqual(row, before);
});

test("empty Dx. remains omitted without changing remarks", () => {
  for (const dx_note of [undefined, null, "", "  "]) {
    const card = mod.exports.render({ dx_note, note: "Dx. legacy free text", provision_diagnosis_text: "Other diagnosis" });
    assert.throws(() => textAfterLabel(card, "Dx."), /Missing notification field/);
    assert.equal(textAfterLabel(card, "หมายเหตุ"), "Dx. legacy free text");
    assert.equal(textAfterLabel(card, "ดมยาสลบ"), "ไม่ใช้");
  }
});

test("dedicated screen remarks retain priority and line breaks when Dx. is omitted", () => {
  const card = mod.exports.render({ dx_note: "Synthetic diagnosis", screen_note: "Screen remark A\r\nScreen remark B", note: "Older case remark" });
  assert.throws(() => textAfterLabel(card, "Dx."), /Missing notification field/);
  assert.equal(textAfterLabel(card, "หมายเหตุ"), "Screen remark A\nScreen remark B");
});

function procedureCards(row) {
  return mod.exports.render(row).contents.body.contents.filter((node) =>
    node.type === "box" && node.contents?.[0]?.text?.startsWith("• "),
  );
}

test("ordered procedures retain their own anatomical site and side, even with identical names", () => {
  const row = {
    operation_names: "Old performed procedure",
    requested_procedures: [
      { operation_list_oper_id: 1, operation_name: "MRM", operation_position: "BREAST", operation_side: "ขวา" },
      { operation_list_oper_id: 2, operation_name: "MRM", operation_position: "BREAST", operation_side: "ซ้าย" },
      { operation_list_oper_id: 3, operation_name: "Excision, local", operation_position: "ARM", operation_side: "ขวา" },
    ],
  };
  const before = structuredClone(row);
  const cards = procedureCards(row);
  assert.deepEqual(cards.map((card) => card.contents.map((item) => item.text)), [
    ["• MRM", "ตำแหน่ง: BREAST · ด้าน: ขวา"],
    ["• MRM", "ตำแหน่ง: BREAST · ด้าน: ซ้าย"],
    ["• Excision, local", "ตำแหน่ง: ARM · ด้าน: ขวา"],
  ]);
  assert.equal(cards[0].contents[1].size, "sm");
  assert.equal(cards[0].contents[1].wrap, true);
  assert.deepEqual(row, before);
});

test("readable card keeps every clinical field, allows full text and avoids undersized body text", () => {
  const row = {
    patient_name: "ชื่อผู้ป่วยสมมติสำหรับทดสอบ นามสกุลสมมติยาวสำหรับทดสอบ",
    hn: "DEMO-0001", age_text: "59 ปี 2 เดือน 28 วัน",
    ward_name: "หอผู้ป่วยสมมติชื่อยาว อาคารผู้ป่วยชั้นห้า",
    request_doctor_name: "แพทย์สมมติชื่อยาว สำหรับตรวจรูปแบบ",
    requested_procedures: [{ operation_name: "Long synthetic procedure, with complete clinical wording", operation_position: "BREAST", operation_side: "ขวา" }],
    dx_note: "Synthetic Dx. A\nSynthetic Dx. B", note: "Synthetic note A\nSynthetic note B",
  };
  const card = mod.exports.render(row);
  const texts = [];
  const visit = (node) => {
    if (node.type === "text") {
      texts.push(node);
      assert.ok(["sm", "md"].includes(node.size), `Body text must remain readable: ${node.text}`);
      assert.equal(node.wrap, true);
      assert.equal(node.maxLines, undefined);
      assert.equal(node.adjustMode, undefined);
    }
    node.contents?.forEach(visit);
  };
  visit(card.contents.body);
  for (const [label, expected] of [
    ["ชื่อ-สกุล", row.patient_name], ["HN", row.hn], ["อายุ", row.age_text],
    ["Ward", row.ward_name], ["แพทย์", row.request_doctor_name],
    ["หมายเหตุ", row.note],
  ]) assert.equal(textAfterLabel(card, label), expected);
  assert.equal(texts.find((node) => node.text === row.patient_name).size, "md");
  assert.equal(texts.find((node) => node.text === `• ${row.requested_procedures[0].operation_name}`).size, "md");
  const patient = card.contents.body.contents.find((node) => node.contents?.[0]?.text === "ข้อมูลผู้ป่วย");
  assert.ok(patient.contents.some((node) => node.contents?.[0]?.text === "HN"));
  assert.ok(patient.contents.some((node) => node.contents?.[0]?.text === "อายุ"));
  const blank = mod.exports.render({});
  assert.throws(() => textAfterLabel(blank, "Dx."), /Missing notification field/);
  for (const label of ["หมายเหตุ", "เวลา NPO", "Ward", "แพทย์", "น้ำหนัก", "ส่วนสูง"])
    assert.equal(textAfterLabel(blank, label), "-", `Missing fields must stay visible: ${label}`);
});

test("schedule date and clock have matching padding with or without on-call emphasis", () => {
  for (const selected of ["Y", "N"]) {
    const card = mod.exports.render({ preop_on_call: selected, request_operation_time: "14:00:00" });
    const schedule = card.contents.body.contents.find((node) => node.contents?.[0]?.contents?.[0]?.text === "วันที่ผ่าตัด");
    const [date, clock] = schedule.contents;
    assert.equal(date.paddingAll, clock.paddingAll);
    assert.equal(clock.contents[1].text, selected === "Y" ? "14:00 · ON\u00A0CALL" : "14:00");
  }
});

test("partial or missing procedure metadata does not create empty labels or borrow another item's site", () => {
  const cards = procedureCards({ requested_procedures: [
    { operation_name: "A", operation_position: "BREAST" },
    { operation_name: "B", operation_side: "ซ้าย" },
    { operation_name: "C", operation_position: "-", operation_side: null },
    { operation_name: "  ", operation_position: "UNUSED" }, null,
  ] });
  assert.deepEqual(cards.map((card) => card.contents.map((item) => item.text)), [
    ["• A", "ตำแหน่ง: BREAST"], ["• B", "ด้าน: ซ้าย"], ["• C"],
  ]);
});

test("legacy fallback keeps commas in names and only assigns case-level metadata to a single procedure", () => {
  assert.deepEqual(procedureCards({ operation_name: "Excision, local", operation_position: "ARM", operation_side: "ขวา" })[0].contents.map((item) => item.text), [
    "• Excision, local", "ตำแหน่ง: ARM · ด้าน: ขวา",
  ]);
  const cards = procedureCards({ requested_procedures: [], operation_names: "A\nB", operation_position: "ARM", operation_side: "ขวา" });
  assert.deepEqual(cards.map((card) => card.contents.map((item) => item.text)), [["• A"], ["• B"]]);
});

test("HOSxP request reader batches ordered procedures and attaches them without multiplying cases", async () => {
  const compiled = ts.transpileModule(readFileSync(new URL("../lib/hosxp/operations.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  const dependencies = { "@/lib/env": { env: {} }, mariadb: {}, "server-only": {}, "./date-range": {}, "./operation-query": {}, "./positions": {} };
  new Function("require", "module", "exports", `${compiled}\nmodule.exports.readRequests = (query) => { readOnlyQuery = query; return getHosxpOperationRequestRows('o.operation_id > ?', [10], 'o.operation_id'); };`)((id) => {
    assert.ok(id in dependencies, `Unexpected dependency ${id}`);
    return dependencies[id];
  }, loaded, loaded.exports);
  const source = [{ operation_id: 11 }, { operation_id: "12" }];
  const calls = [];
  const result = await loaded.exports.readRequests(async (sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("INFORMATION_SCHEMA")) return [];
    if (sql.includes("FROM operation_list_oper")) return [
      { operation_id: 11, operation_list_oper_id: 1, operation_name: "MRM", operation_side: "ขวา" },
      { operation_id: "11", operation_list_oper_id: 2, operation_name: "MRM", operation_side: "ซ้าย" },
    ];
    return source;
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].requested_procedures.map((item) => item.operation_side), ["ขวา", "ซ้าย"]);
  assert.deepEqual(result[1].requested_procedures, []);
  assert.deepEqual(source, [{ operation_id: 11 }, { operation_id: "12" }]);
  const batch = calls.filter((call) => call.sql.includes("FROM operation_list_oper"));
  assert.equal(batch.length, 1);
  assert.deepEqual(batch[0].params, ["11", "12"]);
  assert.match(batch[0].sql, /WHERE operation_id IN \(\?,\?\)/);
  assert.match(batch[0].sql, /ORDER BY operation_id, operation_list_oper_id/);
  assert.equal((await loaded.exports.readRequests(async () => [])).length, 0);
});
