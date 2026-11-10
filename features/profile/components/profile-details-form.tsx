"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, Check, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { WorkFields } from "@/features/shared/components/work-fields";

const schema = z.object({ name: z.string().trim().min(1).max(191), organization: z.string().trim().max(191), mission: z.string().trim().max(191), workGroup: z.string().trim().max(191), jobTitle: z.string().trim().max(191), jobLevel: z.string().trim().max(191) });
export type ProfileValues = z.infer<typeof schema>;

const inputClass = "mt-2 block h-12 w-full rounded-xl border border-input bg-background px-3.5 text-sm font-normal shadow-sm transition placeholder:text-muted-foreground/70 hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function ProfileDetailsForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const form = useForm<ProfileValues>({ resolver: zodResolver(schema), defaultValues: initial });
  const mutation = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const response = await fetch("/api/profile/details", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!response.ok) throw new Error("ไม่สามารถบันทึกโปรไฟล์ได้ กรุณาลองใหม่");
    },
    onSuccess: (_, values) => { form.reset(values); toast.success("บันทึกโปรไฟล์แล้ว"); router.refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const fieldErrors = form.formState.errors;

  return <section className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start gap-3.5"><span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/10 bg-primary/8 text-primary"><Building2 aria-hidden="true" className="size-5" /></span><div><p className="text-[10px] font-bold tracking-[0.16em] text-primary">PERSONAL INFORMATION</p><h2 className="mt-0.5 text-lg font-semibold tracking-tight">ข้อมูลส่วนตัวและการทำงาน</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ข้อมูลหน่วยงานและตำแหน่งไม่บังคับกรอก และแก้ไขได้ภายหลัง</p></div></div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"><UserRound aria-hidden="true" className="size-3.5" />แก้ไขได้เฉพาะข้อมูลของฉัน</span>
    </div>
    <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-6 p-5 sm:p-7">
      <div className="max-w-2xl"><label className="block text-sm font-semibold">ชื่อที่แสดงในระบบ<input {...form.register("name")} maxLength={191} required className={inputClass} placeholder="ระบุชื่อและนามสกุล" aria-invalid={Boolean(fieldErrors.name)} /></label>{fieldErrors.name && <p role="alert" className="mt-1.5 text-xs text-destructive">กรุณาระบุชื่อให้ถูกต้อง</p>}</div>
      <div className="rounded-2xl border border-border/80 bg-muted/25 p-4 sm:p-5"><WorkFields register={form.register} disabled={mutation.isPending} /></div>
      {Object.keys(fieldErrors).length > 0 && <p role="alert" className="text-sm text-destructive">กรุณาตรวจสอบชื่อและข้อมูลที่กรอก</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-muted-foreground">การเปลี่ยนแปลงจะมีผลกับข้อมูลโปรไฟล์ของคุณ</p><button type="submit" disabled={mutation.isPending || !form.formState.isDirty} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? <><span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />กำลังบันทึก…</> : <><Check aria-hidden="true" className="size-4" />บันทึกข้อมูล</>}</button></div>
    </form>
  </section>;
}
