"use client";

import { useMutation } from "@tanstack/react-query";
import { ImagePlus, ShieldCheck, Signature, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ProfileAvatar } from "./profile-avatar";
import { SignaturePad } from "./signature-pad";
import { roleLabels } from "@/features/workspace/components/navigation";
import type { UserRole } from "@/lib/permissions";
import { ProfileDetailsForm, type ProfileValues } from "./profile-details-form";
import { PasswordChangeForm } from "./password-change-form";

type Kind = "avatar" | "signature";
type Change = { kind: Kind; image: Blob | null };
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

export function ProfileEditor({ user, work, hasCredential, initialAvatar, initialSignature }: { user: { name: string; email: string; username: string | null; role: UserRole }; work: ProfileValues; hasCredential: boolean; initialAvatar: boolean; initialSignature: boolean }) {
  const [hasAvatar, setHasAvatar] = useState(initialAvatar);
  const [hasSignature, setHasSignature] = useState(initialSignature);
  const [signatureVersion, setSignatureVersion] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const signatureInput = useRef<HTMLInputElement>(null);
  const mutation = useMutation({ mutationFn: async ({ kind, image }: Change) => {
    if (image && (image.size === 0 || image.size > 3 * 1024 * 1024)) throw new Error("กรุณาเลือกภาพขนาดไม่เกิน 3 MB");
    const response = await fetch(`/api/profile/${kind}`, { method: image ? "PUT" : "DELETE", ...(image ? { headers: { "Content-Type": image.type || "application/octet-stream" }, body: image } : {}) });
    if (response.status === 400) throw new Error("ภาพไม่ถูกต้อง กรุณาใช้ไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน 3 MB");
    if (!response.ok) throw new Error("ไม่สามารถบันทึกได้ กรุณาลองอีกครั้ง");
  }, onSuccess: (_, { kind, image }) => {
    if (kind === "avatar") { setHasAvatar(Boolean(image)); window.dispatchEvent(new Event("profile-avatar-updated")); }
    else { setHasSignature(Boolean(image)); setSignatureVersion(Date.now()); }
    toast.success(image ? (kind === "avatar" ? "บันทึกรูปโปรไฟล์แล้ว" : "บันทึกลายเซ็นแล้ว") : "ลบรูปเรียบร้อยแล้ว");
  }, onError: (error) => toast.error(error.message) });
  function upload(kind: Kind, file?: File) { if (file) mutation.mutate({ kind, image: file }); }
  const busy = mutation.isPending;
  return <div className="space-y-7"><div><p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-primary">PERSONAL PROFILE</p><h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[34px]">โปรไฟล์ของฉัน</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">จัดการข้อมูลส่วนตัว รูปโปรไฟล์ ลายเซ็น และรหัสผ่าน</p></div><ProfileDetailsForm initial={work} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]"><section className="min-w-0 rounded-[20px] border border-border bg-card p-5 shadow-[0_5px_24px_#11271a06] sm:p-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><ImagePlus className="size-5" /></span><div><h2 className="font-semibold">รูปโปรไฟล์</h2><p className="text-xs text-muted-foreground">รูปภาพประจำบัญชี</p></div></div><div className="mt-7 flex flex-wrap items-center gap-5"><ProfileAvatar name={user.name} className="size-24 rounded-[24px] text-3xl" /><div className="min-w-0"><p className="break-words text-lg font-semibold">{user.name}</p><p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p><p className="mt-1 break-all text-xs text-muted-foreground">ชื่อผู้ใช้: {user.username || "ยังไม่ระบุ"}</p><span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-primary"><ShieldCheck className="size-3.5" /> {roleLabels[user.role]}</span></div></div><p className="mt-6 text-sm leading-6 text-muted-foreground">รองรับ PNG, JPG หรือ WebP ขนาดไม่เกิน 3 MB</p><input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="เลือกภาพโปรไฟล์" onChange={(event) => { upload("avatar", event.target.files?.[0]); event.currentTarget.value = ""; }} /><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => avatarInput.current?.click()} className={actionClass}><Upload className="size-4" /> {hasAvatar ? "เปลี่ยนรูป" : "เพิ่มรูปโปรไฟล์"}</button>{hasAvatar && <button type="button" disabled={busy} onClick={() => mutation.mutate({ kind: "avatar", image: null })} className={actionClass}><Trash2 className="size-4" /> ลบรูป</button>}</div></section>
      <section className="min-w-0 rounded-[20px] border border-border bg-card p-5 shadow-[0_5px_24px_#11271a06] sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Signature className="size-5" /></span><div><h2 className="font-semibold">ลายเซ็นของฉัน</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">หนึ่งบัญชีมีลายเซ็นได้หนึ่งรายการ การบันทึกใหม่จะแทนลายเซ็นเดิม</p></div></div><div className="mt-6"><p className="mb-2 text-sm font-semibold">ลายเซ็นที่บันทึกไว้</p><div className="flex min-h-28 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-4">{hasSignature ? <Image unoptimized width={1200} height={400} src={`/api/profile/signature?v=${signatureVersion}`} alt="ลายเซ็นที่บันทึกไว้" className="h-auto max-h-28 w-auto max-w-full object-contain" /> : <span className="text-sm text-slate-500">ยังไม่มีลายเซ็น</span>}</div></div><input ref={signatureInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="เลือกภาพลายเซ็น" onChange={(event) => { upload("signature", event.target.files?.[0]); event.currentTarget.value = ""; }} /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => signatureInput.current?.click()} className={actionClass}><Upload className="size-4" /> อัปโหลดภาพลายเซ็น</button>{hasSignature && <button type="button" disabled={busy} onClick={() => mutation.mutate({ kind: "signature", image: null })} className={actionClass}><Trash2 className="size-4" /> ลบลายเซ็น</button>}</div><div className="mt-6 border-t border-border pt-5"><p className="mb-1 text-sm font-semibold">เขียนลายเซ็น</p><p className="mb-3 text-xs leading-5 text-muted-foreground">ใช้เมาส์ ปากกา หรือปลายนิ้วเขียนในพื้นที่ด้านล่าง</p><SignaturePad disabled={busy} onSave={(image) => mutation.mutate({ kind: "signature", image })} /></div></section></div>
    <PasswordChangeForm hasCredential={hasCredential} /></div>;
}
