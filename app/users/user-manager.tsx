"use client";

import { useState, type FormEvent } from "react";
import { roles, type UserRole } from "@/lib/permissions";

type User = { id: string; name: string; email: string; role: UserRole; isActive: boolean };
const roleLabels: Record<UserRole, string> = { SUPERADMIN: "Superadmin", ADMIN: "Admin", NURSE: "Nurse", USER: "User" };

export function UserManager({ isSuperadmin, initialUsers, initialHasMore }: { isSuperadmin: boolean; initialUsers: User[]; initialHasMore: boolean }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [editing, setEditing] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const allowedRoles = roles.filter((role) => isSuperadmin || role !== "SUPERADMIN");

  async function load() {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    setUsers(data.users); setHasMore(data.hasMore);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const body = { name: String(data.get("name") ?? ""), email: String(data.get("email") ?? ""), role: String(data.get("role") ?? "USER"), ...(editing ? { isActive: data.get("isActive") === "on" } : {}), ...(!editing || password ? { password } : {}) };
    try {
      const response = await fetch(editing ? `/api/users/${encodeURIComponent(editing.id)}` : "/api/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (response.status === 409) { setError(result.error === "lastSuperadmin" ? "ต้องมี superadmin ที่ใช้งานอยู่ อย่างน้อยหนึ่งบัญชี" : "ไม่สามารถบันทึกได้ อีเมลอาจซ้ำหรือบัญชีไม่มีข้อมูลรหัสผ่าน"); return; }
      if (!response.ok) throw new Error();
      setMessage(editing ? "บันทึกบัญชีแล้ว" : "สร้างบัญชีแล้ว"); setEditing(null); form.reset();
      try { await load(); } catch { setError("บันทึกแล้ว แต่ไม่สามารถโหลดรายการบัญชีได้"); }
    } catch { setError("ไม่สามารถบันทึกบัญชีได้ โปรดตรวจสอบข้อมูลและสิทธิ์ของคุณ"); }
    finally { setBusy(false); }
  }

  return <div className="mb-[30px] rounded-[18px] border border-[#dcebe3] bg-white p-7"><h2>{editing ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}</h2><form key={editing?.id ?? "new"} onSubmit={submit}>
    <div className="grid grid-cols-2 gap-x-[18px] max-[600px]:grid-cols-1 [&_label]:min-w-0"><label className="mt-5 block text-sm font-bold">ชื่อ<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="name" defaultValue={editing?.name ?? ""} maxLength={191} required /></label><label className="mt-5 block text-sm font-bold">อีเมล<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="email" type="email" defaultValue={editing?.email ?? ""} maxLength={191} required /></label><label className="mt-5 block text-sm font-bold">บทบาท<select className="mt-2 block w-full rounded-lg border border-[#cbded4] bg-white p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="role" defaultValue={editing?.role ?? "USER"}>{allowedRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label><label className="mt-5 block text-sm font-bold">{editing ? "รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)" : "รหัสผ่านเริ่มต้น"}<input className="mt-2 block w-full rounded-lg border border-[#cbded4] p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required={!editing} /></label></div>
    {editing && <label className="mt-5 flex items-center gap-2.5 text-sm font-bold [&_input]:m-0 [&_input]:w-auto"><input className="size-4 accent-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3]" name="isActive" type="checkbox" defaultChecked={editing.isActive} /> เปิดใช้งานบัญชี</label>}
    <div className="flex flex-wrap items-center gap-4"><button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>{editing && <button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={() => setEditing(null)}>ยกเลิก</button>}</div>
  </form>{error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}{message && <p className="leading-[1.8] text-[#65817c]" role="status">{message}</p>}
  <div className="mt-[34px] [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-[#65817c]"><h2>บัญชีผู้ใช้</h2>{hasMore && <p className="leading-[1.8] text-[#65817c]">แสดง 200 บัญชีแรก</p>}<div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead><tr><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">ชื่อ</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">อีเมล</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">บทบาท</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">สถานะ</th><th className="border-b border-[#e5eee8] px-2.5 py-3.5 font-semibold text-[#6a817a]">จัดการ</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{user.name}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{user.email}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{roleLabels[user.role]}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{user.isActive ? "ใช้งาน" : "ระงับ"}</td><td className="border-b border-[#e5eee8] px-2.5 py-3.5">{(isSuperadmin || user.role !== "SUPERADMIN") && <button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { setEditing(user); setError(""); setMessage(""); }}>แก้ไข</button>}</td></tr>)}</tbody></table></div></div></div>;
}
