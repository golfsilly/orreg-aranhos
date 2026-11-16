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
      if (index !== -1) return children[index + 1]?.text;
      pending.push(...children);
    }
  }
  throw new Error(`Missing notification field ${label}`);
}

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
    assert.equal(textAfterLabel(card, "เวลาผ่าตัด"), "ON CALL");
    assert.throws(() => textAfterLabel(card, "On call"), /Missing notification field/);
    const schedule = card.contents.body.contents.find((node) => node.contents?.[1]?.contents?.[0]?.text === "เวลาผ่าตัด").contents[1];
    assert.equal(schedule.contents[1].color, "#B42318");
    assert.equal(schedule.backgroundColor, "#FFF1F2");
  }
});

test("on-call follows an entered scheduled time in the same highlighted field", () => {
  for (const selected of ["Y", "1", 1, "true", "on call"]) {
    const card = mod.exports.render({ request_operation_time: "09:30:00", preop_on_call: selected });
    assert.equal(textAfterLabel(card, "เวลาผ่าตัด"), "09:30 · ON CALL");
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

test("missing allergy data is unspecified while explicit source statements remain unchanged", () => {
  for (const value of [undefined, null, "", "  ", "-"]) {
    assert.equal(textAfterLabel(mod.exports.render({ patient_drug_allergy: value }), "การแพ้ยา"), "ไม่ระบุ");
  }
  const sourceStatement = "ปฏิเสธการแพ้ยา";
  assert.equal(textAfterLabel(mod.exports.render({ patient_drug_allergy: sourceStatement }), "การแพ้ยา"), sourceStatement);
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
  assert.equal(cards[0].contents[1].size, "xs");
  assert.equal(cards[0].contents[1].wrap, true);
  assert.deepEqual(row, before);
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
