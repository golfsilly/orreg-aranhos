import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { createDailyRegisterPdf } from "../lib/register/daily-pdf.ts";
import { createDailyRegisterXlsx } from "../lib/register/daily-xlsx.ts";

function unzipText(zip, wantedName) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(end + 10);
  let cursor = zip.readUInt32LE(end + 16);
  for (let index = 0; index < count; index += 1) {
    const nameLength = zip.readUInt16LE(cursor + 28);
    const extraLength = zip.readUInt16LE(cursor + 30);
    const commentLength = zip.readUInt16LE(cursor + 32);
    const name = zip.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (name === wantedName) {
      const localOffset = zip.readUInt32LE(cursor + 42);
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const compressedLength = zip.readUInt32LE(cursor + 20);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      return inflateRawSync(zip.subarray(dataStart, dataStart + compressedLength)).toString("utf8");
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`Missing XLSX entry: ${wantedName}`);
}

test("generates a Sarabun daily PDF with page breaks for synthetic records", async () => {
  const rows = Array.from({ length: 18 }, (_, index) => ({
    registerNumber: `${index + 1}/11`, name: `ตัวอย่าง ${index + 1}`, age: "30 ปี", hn: "TEST-HN",
    operationDate: "2026-11-07", startedAt: "2026-11-07 08:00:00", endedAt: "2026-11-07 09:00:00",
    ward: "Ward test", urgency: "Elective", provisionDiagnosis: "A00", provisionName: "Dx test",
    diagnosisText: "ข้อมูลวินิจฉัยทดสอบเพื่อทดสอบการตัดหน้า PDF ".repeat(5), patho: false,
    preOp: true, postOp: false, anesthesia: "GA", surgeryClass: "MAJOR", minorPeriod: null, team: "ตัวอย่างทีมผ่าตัด",
  }));
  const pdf = await createDailyRegisterPdf(rows, "2026-11-07");
  assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
  const source = pdf.toString("latin1");
  assert.match(source, /Sarabun-Regular/);
  assert.ok((source.match(/\/Type \/Page\n/g) ?? []).length > 1);
});

test("generates a filterable XLSX daily register with Thai headers and synthetic rows", () => {
  const workbook = createDailyRegisterXlsx([{
    registerNumber: "1/11", name: "ตัวอย่าง", age: "30 ปี", hn: "TEST-HN", operationDate: "2026-11-07",
    startedAt: "2026-11-07 08:00:00", endedAt: "2026-11-07 09:00:00", ward: "Ward test", urgency: "ELECTIVE",
    provisionDiagnosis: "A00", provisionName: "Synthetic Dx", diagnosisText: "Synthetic diagnosis text",
    patho: true, preOp: true, postOp: false, anesthesia: "GA", surgeryClass: "MAJOR", minorPeriod: null,
    team: "Synthetic team",
  }]);
  assert.equal(workbook.subarray(0, 2).toString("hex"), "504b");
  const sheet = unzipText(workbook, "xl/worksheets/sheet1.xml");
  assert.match(sheet, /เลขทะเบียน/);
  assert.match(sheet, /TEST-HN/);
  assert.match(sheet, /autoFilter/);
  assert.match(unzipText(workbook, "xl/workbook.xml"), /ทะเบียนผ่าตัด/);
});
