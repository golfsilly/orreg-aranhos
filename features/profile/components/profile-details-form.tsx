"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { WorkFields } from "@/features/shared/components/work-fields";

const schema = z.object({ name: z.string().trim().min(1).max(191), organization: z.string().trim().max(191), mission: z.string().trim().max(191), workGroup: z.string().trim().max(191), jobTitle: z.string().trim().max(191), jobLevel: z.string().trim().max(191) });
export type ProfileValues = z.infer<typeof schema>;
export function ProfileDetailsForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const form = useForm<ProfileValues>({ resolver: zodResolver(schema), defaultValues: initial });
  const mutation = useMutation({ mutationFn: async (values: ProfileValues) => {
    const response = await fetch("/api/profile/details", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!response.ok) throw new Error("ไม่สามารถบันทึกโปรไฟล์ได้ กรุณาลองใหม่");
  }, onSuccess: (_, values) => { form.reset(values); toast.success("บันทึกโปรไฟล์แล้ว"); router.refresh(); }, onError: (error) => toast.error(error.message) });
  return <section className="rounded-[20px] border border-border bg-card p-5 shadow-[0_5px_24px_#11271a06] sm:p-7"><h2 className="text-lg font-semibold">ข้อมูลส่วนตัวและการทำงาน</h2><p className="mt-1 text-sm text-muted-foreground">แก้ไขชื่อ หน่วยงาน และตำแหน่งของคุณ</p><form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="mt-5 space-y-6"><label className="block max-w-xl text-sm font-semibold">ชื่อ<input {...form.register("name")} maxLength={191} required className="mt-2 block h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-ring" /></label><WorkFields register={form.register} disabled={mutation.isPending} />{Object.keys(form.formState.errors).length > 0 && <p role="alert" className="text-sm text-destructive">กรุณาตรวจสอบชื่อและข้อมูลที่กรอก</p>}<button type="submit" disabled={mutation.isPending || !form.formState.isDirty} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutation.isPending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</button></form></section>;
}
