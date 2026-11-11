"use client";

import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import {
  BadgeCheck,
  Camera,
  ImagePlus,
  Mail,
  ShieldCheck,
  Signature,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { ProfileAvatar } from "./profile-avatar";
import { SignaturePad } from "./signature-pad";
import { roleLabels } from "@/features/workspace/components/navigation";
import type { UserRole } from "@/lib/permissions";
import { ProfileDetailsForm, type ProfileValues } from "./profile-details-form";
import { PasswordChangeForm } from "./password-change-form";

type Kind = "avatar" | "signature";
type Change = { kind: Kind; image: Blob | null };

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/25 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";

function SectionHeading({ icon: Icon, eyebrow, title, description }: { icon: LucideIcon; eyebrow: string; title: string; description: string }) {
  return <div className="flex items-start gap-3.5">
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/8 text-primary shadow-sm"><Icon aria-hidden="true" className="size-5" /></span>
    <span className="min-w-0"><span className="block text-[10px] font-bold tracking-[0.16em] text-primary">{eyebrow}</span><span className="mt-0.5 block text-lg font-semibold tracking-tight">{title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{description}</span></span>
  </div>;
}

export function ProfileEditor({ user, work, hasCredential, initialAvatar, initialSignature }: { user: { name: string; email: string; username: string | null; role: UserRole }; work: ProfileValues; hasCredential: boolean; initialAvatar: boolean; initialSignature: boolean }) {
  const [hasAvatar, setHasAvatar] = useState(initialAvatar);
  const [hasSignature, setHasSignature] = useState(initialSignature);
  const [signatureVersion, setSignatureVersion] = useState(0);
  const avatarInput = useRef<HTMLInputElement>(null);
  const signatureInput = useRef<HTMLInputElement>(null);
  const mutation = useMutation({
    mutationFn: async ({ kind, image }: Change) => {
      if (image && (image.size === 0 || image.size > 3 * 1024 * 1024)) throw new Error("กรุณาเลือกภาพขนาดไม่เกิน 3 MB");
      const response = await fetch(`/api/profile/${kind}`, { method: image ? "PUT" : "DELETE", ...(image ? { headers: { "Content-Type": image.type || "application/octet-stream" }, body: image } : {}) });
      if (response.status === 400) throw new Error("ภาพไม่ถูกต้อง กรุณาใช้ไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน 3 MB");
      if (!response.ok) throw new Error("ไม่สามารถบันทึกได้ กรุณาลองอีกครั้ง");
    },
    onSuccess: (_, { kind, image }) => {
      if (kind === "avatar") { setHasAvatar(Boolean(image)); window.dispatchEvent(new Event("profile-avatar-updated")); }
      else { setHasSignature(Boolean(image)); setSignatureVersion(Date.now()); }
      toast.success(image ? (kind === "avatar" ? "บันทึกรูปโปรไฟล์แล้ว" : "บันทึกลายเซ็นแล้ว") : kind === "avatar" ? "ลบรูปโปรไฟล์แล้ว" : "ลบลายเซ็นแล้ว");
    },
    onError: (error) => toast.error(error.message),
  });
  function upload(kind: Kind, file?: File) { if (file) mutation.mutate({ kind, image: file }); }
  const busy = mutation.isPending;

  return <div className="mx-auto w-full max-w-[1480px] space-y-6 pb-8 sm:space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4 px-1">
      <div><p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-primary">PERSONAL PROFILE</p><h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">โปรไฟล์ของฉัน</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">ดูแลข้อมูลส่วนตัว หน่วยงาน ความปลอดภัยของบัญชี และลายเซ็นสำหรับการใช้งานในระบบ</p></div>
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 text-xs font-semibold text-primary"><ShieldCheck className="size-4" />ข้อมูลบัญชีส่วนบุคคล</span>
    </header>

    <section className="relative isolate overflow-hidden rounded-[28px] border border-primary/20 bg-primary px-5 py-6 text-primary-foreground shadow-md sm:px-8 sm:py-8 lg:px-10 dark:border-border dark:bg-card dark:text-card-foreground">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_5%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_34%)] dark:bg-[radial-gradient(ellipse_at_85%_5%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_34%)]" />
      <div aria-hidden="true" className="absolute right-[-54px] top-[-110px] -z-10 size-72 rounded-full border border-white/10 lg:right-14 lg:top-[-180px] lg:size-[440px]" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
        <div className="relative w-fit rounded-[25px] bg-white/10 p-1.5 shadow-xl ring-1 ring-white/20"><ProfileAvatar name={user.name} className="size-24 rounded-[21px] border border-white/20 text-3xl sm:size-28" /><span className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-xl border-2 border-border bg-accent text-primary shadow"><BadgeCheck aria-hidden="true" className="size-4" /></span></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-foreground/70 dark:text-muted-foreground">OR-REG · บัญชีผู้ใช้งาน</p>
          <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-primary-foreground/85 dark:text-card-foreground">
            <span className="inline-flex min-w-0 items-center gap-2 break-all"><Mail aria-hidden="true" className="size-4 shrink-0 text-primary-foreground/80 dark:text-primary" />{user.email}</span>
            <span className="hidden text-white/30 sm:inline">·</span>
            <span className="inline-flex min-w-0 items-center gap-2"><UserRound aria-hidden="true" className="size-4 shrink-0 text-primary-foreground/80 dark:text-primary" />{user.username || "ยังไม่ตั้งชื่อผู้ใช้"}</span>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/35 bg-accent/12 px-3.5 py-1.5 text-xs font-semibold text-primary"><ShieldCheck aria-hidden="true" className="size-4" />{roleLabels[user.role]}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-56 sm:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3"><span className="block text-[10px] font-medium text-primary-foreground/65 dark:text-muted-foreground">สถานะบัญชี</span><span className="mt-1 flex items-center gap-2 text-sm font-semibold"><span className="size-2 rounded-full bg-emerald-300 shadow-md" />ใช้งานปกติ</span></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3"><span className="block text-[10px] font-medium text-primary-foreground/65 dark:text-muted-foreground">ลายเซ็น</span><span className="mt-1 text-sm font-semibold">{hasSignature ? "บันทึกแล้ว" : "ยังไม่ได้บันทึก"}</span></div>
        </div>
      </div>
    </section>

    <ProfileDetailsForm initial={work} />

    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(290px,0.72fr)_minmax(0,1.28fr)]">
      <section className="min-w-0 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
        <div className="border-b border-border/80 px-5 py-5 sm:px-7"><SectionHeading icon={ImagePlus} eyebrow="PROFILE IMAGE" title="รูปโปรไฟล์" description="ภาพที่แสดงแทนตัวคุณในเมนูและรายการผู้ใช้งาน" /></div>
        <div className="p-5 sm:p-7">
          <div className="flex flex-col items-center rounded-[20px] border border-dashed border-primary/20 bg-gradient-to-br from-primary/[0.06] via-transparent to-card/[0.06] px-4 py-7 text-center">
            <div className="rounded-[25px] bg-card p-1.5 shadow-lg ring-1 ring-border"><ProfileAvatar name={user.name} className="size-28 rounded-[20px] text-3xl" /></div>
            <p className="mt-4 max-w-full break-words text-lg font-semibold">{user.name}</p><p className="mt-1 max-w-full break-all text-xs text-muted-foreground">{user.email}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground"><ShieldCheck className="size-3.5" />{roleLabels[user.role]}</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">รองรับ PNG, JPG และ WebP ขนาดไม่เกิน 3 MB</p>
          <input ref={avatarInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="เลือกภาพโปรไฟล์" onChange={(event) => { upload("avatar", event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => avatarInput.current?.click()} className={`${actionClass} flex-1`}><Camera aria-hidden="true" className="size-4 text-primary" />{hasAvatar ? "เปลี่ยนรูป" : "เพิ่มรูปโปรไฟล์"}</button>{hasAvatar && <button type="button" disabled={busy} onClick={() => mutation.mutate({ kind: "avatar", image: null })} aria-label="ลบรูปโปรไฟล์" title="ลบรูปโปรไฟล์" className={`${actionClass} px-3 text-destructive`}><Trash2 aria-hidden="true" className="size-4" /></button>}</div>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
        <div className="border-b border-border/80 px-5 py-5 sm:px-7"><SectionHeading icon={Signature} eyebrow="DIGITAL SIGNATURE" title="ลายเซ็นของฉัน" description="เก็บลายเซ็นส่วนตัวหนึ่งรายการต่อบัญชี ใช้ประกอบเอกสารภายในระบบ" /></div>
        <div className="p-5 sm:p-7">
          <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-[18px] border border-border bg-white p-4 shadow-inner sm:min-h-36">{hasSignature ? <Image unoptimized width={1200} height={400} src={`/api/profile/signature?v=${signatureVersion}`} alt="ลายเซ็นที่บันทึกไว้" className="h-auto max-h-32 w-auto max-w-full object-contain" /> : <div className="text-center"><Signature aria-hidden="true" className="mx-auto size-7 text-slate-300" /><span className="mt-2 block text-sm text-slate-500">ยังไม่มีลายเซ็นที่บันทึกไว้</span></div>}</div>
          <input ref={signatureInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="เลือกภาพลายเซ็น" onChange={(event) => { upload("signature", event.target.files?.[0]); event.currentTarget.value = ""; }} />
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => signatureInput.current?.click()} className={`${actionClass} flex-1`}><Upload aria-hidden="true" className="size-4 text-primary" />อัปโหลดภาพลายเซ็น</button>{hasSignature && <button type="button" disabled={busy} onClick={() => mutation.mutate({ kind: "signature", image: null })} aria-label="ลบลายเซ็น" title="ลบลายเซ็น" className={`${actionClass} px-3 text-destructive`}><Trash2 aria-hidden="true" className="size-4" /></button>}</div>
          <div className="mt-6 border-t border-border pt-5"><div className="mb-3 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-muted text-muted-foreground"><Signature aria-hidden="true" className="size-4" /></span><div><p className="text-sm font-semibold">เขียนลายเซ็น</p><p className="text-xs text-muted-foreground">ใช้เมาส์ ปากกา หรือปลายนิ้ว</p></div></div><SignaturePad disabled={busy} onSave={(image) => mutation.mutate({ kind: "signature", image })} /></div>
        </div>
      </section>
    </div>

    <PasswordChangeForm hasCredential={hasCredential} />
  </div>;
}
