"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { anesthesiaOptions, registerDetailsSchema, type Anesthesia, type MinorPeriod, type RegisterDetails, type SurgeryClass } from "@/lib/register/details";
import { EditorSkeleton } from "../shared/operations-skeleton";

const emptyDetails: RegisterDetails = { patho: false, preOp: false, postOp: false, anesthesia: null, urgency: null, surgeryClass: null, minorPeriod: null, diagnosis: "", remark: "" };
type DetailsResponse = RegisterDetails & { revision: number };

export function DetailsEditor({ operationId, onClose, onSaved }: { operationId: string; onClose: () => void; onSaved: (details: RegisterDetails) => void }) {
  const form = useForm<RegisterDetails>({ resolver: zodResolver(registerDetailsSchema), defaultValues: emptyDetails });
  const values = useWatch({ control: form.control }) as RegisterDetails;
  const update = (next: RegisterDetails) => { for (const key of Object.keys(next) as (keyof RegisterDetails)[]) form.setValue(key, next[key] as never, { shouldDirty: true }); };
  const [savedRevision, setSavedRevision] = useState<number | null>(null);
  const [error, setError] = useState("");
  const id = useId();
  const query = useQuery({
    queryKey: ["register-details", operationId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("โหลดข้อมูลเพิ่มเติมไม่สำเร็จ");
      return response.json() as Promise<DetailsResponse>;
    },
  });
  useEffect(() => {
    if (!query.data) return;
    const { revision: currentRevision, ...details } = query.data;
    void currentRevision;
    form.reset({ ...emptyDetails, ...details, remark: details.remark ?? "" });
  }, [query.data, form]);
  const revision = savedRevision ?? query.data?.revision ?? null;
  const mutation = useMutation({
    mutationFn: async (details: RegisterDetails) => {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/details`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, details }),
      });
      if (response.status === 409) throw new Error("รายการถูกแก้ไขโดยผู้ใช้อื่น กรุณาปิดแล้วเปิดรายการใหม่ก่อนบันทึก");
      if (!response.ok) throw new Error("บันทึกข้อมูลเพิ่มเติมไม่สำเร็จ กรุณาลองอีกครั้ง");
      return response.json() as Promise<{ revision: number }>;
    },
    onSuccess: (data, details) => { setSavedRevision(data.revision); toast.success("บันทึกข้อมูลเรียบร้อยแล้ว"); onSaved(details); },
  });
  async function save(details: RegisterDetails) {
    setError("");
    try { await mutation.mutateAsync(details); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกข้อมูลไม่สำเร็จ"); }
  }
  const saving = mutation.isPending;

  return <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} title="ข้อมูลเพิ่มเติม" description={`ข้อมูลสำหรับทะเบียนผ่าตัด ${operationId}`}>
    {query.isLoading && <EditorSkeleton details />}
    {revision !== null && <form className="space-y-6" onSubmit={form.handleSubmit(save)}>
      <label className="block text-sm font-medium">Diagnosis
        <textarea {...form.register("diagnosis")} maxLength={4000} rows={3} placeholder="กรอก Diagnosis" disabled={saving} className="mt-2 block min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
        <span className="mt-1 block text-right text-xs font-normal text-muted-foreground">{(values.diagnosis ?? "").length}/4000</span>
      </label>
      <section aria-label="การติดตามผู้ป่วย" className="grid gap-3 sm:grid-cols-3">
        {([ ["patho", "ส่งตรวจพยาธิวิทยา", "Patho"], ["preOp", "เยี่ยมก่อนผ่าตัด", "Pre-op"], ["postOp", "เยี่ยมหลังผ่าตัด", "Post-op"] ] as const).map(([field, label, code]) => <label key={field} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition hover:border-primary/40">
          <Checkbox checked={values[field]} onCheckedChange={(checked) => update({ ...values, [field]: checked === true })} disabled={saving} />
          <span>{label}<span className="ml-1.5 text-xs text-muted-foreground">{code}</span></span>
        </label>)}
      </section>
      <fieldset className="rounded-2xl border border-border p-4 sm:p-5" disabled={saving}>
        <legend id={`${id}-class`} className="px-1.5 text-sm font-semibold">ประเภทผ่าตัด</legend>
        <RadioGroup<SurgeryClass | null> aria-labelledby={`${id}-class`} name={`${id}-class`} value={values.surgeryClass} onValueChange={(value) => {
          if (value === "MAJOR" || value === "MINOR") update({ ...values, surgeryClass: value, minorPeriod: value === "MINOR" ? values.minorPeriod : null });
        }}>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-muted"><RadioGroupItem value="MAJOR" /> ผ่าตัดใหญ่ <span className="text-muted-foreground">(Major Surgery)</span></label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-muted"><RadioGroupItem value="MINOR" /> ผ่าตัดเล็ก <span className="text-muted-foreground">(Minor Surgery)</span></label>
        </RadioGroup>
        {values.surgeryClass === "MINOR" && <fieldset className="mt-4 rounded-xl bg-muted/60 p-4" disabled={saving}>
          <legend id={`${id}-period`} className="px-1.5 text-sm font-medium">ช่วงเวลาผ่าตัดเล็ก</legend>
          <RadioGroup<MinorPeriod | null> aria-labelledby={`${id}-period`} name={`${id}-period`} value={values.minorPeriod} onValueChange={(value) => {
            if (value === "OFFICIAL_HOURS" || value === "OUTSIDE_HOURS") update({ ...values, minorPeriod: value });
          }}>
            <label className="flex cursor-pointer items-center gap-3 px-2 py-2 text-sm"><RadioGroupItem value="OFFICIAL_HOURS" /> ในเวลาราชการ</label>
            <label className="flex cursor-pointer items-center gap-3 px-2 py-2 text-sm"><RadioGroupItem value="OUTSIDE_HOURS" /> นอกเวลาราชการ</label>
          </RadioGroup>
        </fieldset>}
      </fieldset>
      <div>
        <label className="text-sm font-medium">ชนิดการดมยา
          <select className="mt-2 block min-h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2.5" value={values.anesthesia ?? ""} onChange={(event) => update({ ...values, anesthesia: (event.target.value || null) as Anesthesia | null })} disabled={saving}>
            <option value="">ยังไม่ระบุ</option>{anesthesiaOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">หมายเหตุ
        <textarea value={values.remark ?? ""} onChange={(event) => update({ ...values, remark: event.target.value })} maxLength={2000} rows={3} placeholder="เพิ่มหมายเหตุสำหรับรายการนี้" disabled={saving} className="mt-2 block min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
        <span className="mt-1 block text-right text-xs font-normal text-muted-foreground">{(values.remark ?? "").length}/2000</span>
      </label>
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>ยกเลิก</Button>
        <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</Button>
      </div>
    </form>}
    {query.isError && <p className="text-sm text-destructive" role="alert">โหลดข้อมูลเพิ่มเติมไม่สำเร็จ กรุณาลองใหม่</p>}
  </AppDialog>;
}
