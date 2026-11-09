import "server-only";
import { deflateRawSync } from "node:zlib";
import type { DailyRegisterRow } from "./daily-export-data";

const columns: { title: string; width: number; value: (row: DailyRegisterRow) => string }[] = [
  { title: "เลขทะเบียน", width: 14, value: (row) => row.registerNumber },
  { title: "แผนก", width: 28, value: (row) => row.departmentName ?? "" },
  { title: "ชื่อ", width: 28, value: (row) => row.name },
  { title: "อายุ", width: 12, value: (row) => row.age ?? "" },
  { title: "HN", width: 16, value: (row) => row.hn },
  { title: "วันที่ผ่าตัด", width: 16, value: (row) => row.operationDate },
  { title: "เริ่มผ่าตัด", width: 20, value: (row) => row.startedAt ?? "" },
  { title: "ผ่าตัดเสร็จ", width: 20, value: (row) => row.endedAt ?? "" },
  { title: "Ward", width: 20, value: (row) => row.ward ?? "" },
  { title: "ห้องผ่าตัด", width: 22, value: (row) => row.room ?? "" },
  { title: "ความเร่งด่วน", width: 18, value: (row) => row.urgency ?? "" },
  { title: "Diagnosis", width: 48, value: (row) => row.diagnosis ?? "" },
  { title: "ลักษณะแผล", width: 28, value: (row) => row.woundNames ?? "" },
  { title: "Pre-op", width: 12, value: (row) => row.preOp ? "✓" : "" },
  { title: "Post-op", width: 12, value: (row) => row.postOp ? "✓" : "" },
  { title: "Patho", width: 12, value: (row) => row.patho ? "✓" : "" },
  { title: "ชนิดการดมยา", width: 20, value: (row) => row.anesthesia ?? "" },
  { title: "ประเภทผ่าตัด", width: 18, value: (row) => row.surgeryClass === "MAJOR" ? "ผ่าตัดใหญ่" : row.surgeryClass === "MINOR" ? "ผ่าตัดเล็ก" : "" },
  { title: "ช่วงเวลาผ่าตัดเล็ก", width: 24, value: (row) => row.minorPeriod === "OFFICIAL_HOURS" ? "ในเวลาราชการ" : row.minorPeriod === "OUTSIDE_HOURS" ? "นอกเวลาราชการ" : "" },
  { title: "ทีมผ่าตัด", width: 64, value: (row) => row.team ?? "" },
  { title: "หมายเหตุ", width: 48, value: (row) => row.remark ?? "" },
];

const xml = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
function columnName(index: number): string {
  let value = index + 1, name = "";
  while (value > 0) { const remainder = (value - 1) % 26; name = String.fromCharCode(65 + remainder) + name; value = Math.floor((value - 1) / 26); }
  return name;
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: { name: string; content: string }[]): Buffer {
  const localParts: Buffer[] = [], centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8"), source = Buffer.from(entry.content, "utf8"), compressed = deflateRawSync(source), checksum = crc32(source);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(source.length, 22); local.writeUInt16LE(name.length, 26); name.copy(local, 30);
    localParts.push(local, compressed);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(source.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 38); central.writeUInt32LE(offset, 42); name.copy(central, 46);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralParts), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralDirectory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

/** Generates a dependency-free .xlsx workbook with filterable daily register rows. */
export function createDailyRegisterXlsx(rows: DailyRegisterRow[]): Buffer {
  const sheetRows = [columns.map((item) => item.title), ...rows.map((row) => columns.map((item) => item.value(row)))];
  const cells = sheetRows.map((values, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const cellsXml = values.map((value, colIndex) => `<c r="${columnName(colIndex)}${rowNumber}"${rowIndex === 0 ? ' s="1"' : ""} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join("");
    return `<row r="${rowNumber}">${cellsXml}</row>`;
  }).join("");
  const lastColumn = columnName(columns.length - 1), lastRow = sheetRows.length;
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns.map((item, index) => `<col min="${index + 1}" max="${index + 1}" width="${item.width}" customWidth="1"/>`).join("")}</cols><sheetData>${cells}</sheetData><autoFilter ref="A1:${lastColumn}${lastRow}"/><pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF126044"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return zip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="ทะเบียนผ่าตัด" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: styles },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
  ]);
}

/** Monthly export uses the same detailed, filterable register worksheet. */
export const createMonthlyRegisterXlsx = createDailyRegisterXlsx;
