"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { parseBangkokMinute, parseRegisterTimes, timeFields, type TimeField } from "@/lib/register/times";
import { EditorSkeleton } from "../shared/operations-skeleton";
import { RegisterDateTimeField } from "../shared/register-datetime-field";

const fieldNames: Record<TimeField, string> = {
  roomEnteredAt: "เวลาเข้าห้องผ่าตัด",
  operationStartedAt: "เวลาเริ่มผ่าตัด",
  operationEndedAt: "เวลาผ่าตัดเสร็จ",
  roomExitedAt: "เวลาออกจากห้องผ่าตัด",
};
const emptyValues = { roomEnteredAt: "", operationStartedAt: "", operationEndedAt: "", roomExitedAt: "" };
const schema = z.object({
  roomEnteredAt: z.string(), operationStartedAt: z.string(), operationEndedAt: z.string(), roomExitedAt: z.string(),
}).superRefine((values, context) => {
  let invalid = false;
  for (const field of timeFields) {
    try { parseBangkokMinute(values[field]); } catch {
      invalid = true;
      context.addIssue({ code: "custom", path: [field], message: "เลือกวันที่และระบุเวลา 00:00–23:59 ให้ครบ หรือกดล้าง" });
    }
  }
  if (!invalid) try { parseRegisterTimes(values); } catch {
    context.addIssue({ code: "custom", path: ["root"], message: "ลำดับเวลาต้องเป็น เข้าห้อง → เริ่มผ่าตัด → ผ่าตัดเสร็จ → ออกจากห้อง" });
  }
});
const timeGroups = [
  { title: "ช่วงเวลาผ่าตัด", description: "ตั้งแต่เริ่มลงมือผ่าตัดจนผ่าตัดเสร็จ", fields: ["operationStartedAt", "operationEndedAt"] },
  { title: "ช่วงเวลาใช้ห้องผ่าตัด", description: "ตั้งแต่ผู้ป่วยเข้าห้องจนออกจากห้องผ่าตัด", fields: ["roomEnteredAt", "roomExitedAt"] },
] as const;
type Values = z.infer<typeof schema>;

function toLocalInput(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) return value.replace(" ", "T").slice(0, 16);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function TimesEditor({ operationId, onClose, operationDate, sourceStartedAt, sourceEndedAt }: {
  operationId: string; onClose: () => void; operationDate?: string; sourceStartedAt?: string | null; sourceEndedAt?: string | null;
}) {
  const id = useId();
  const [savedRevision, setSavedRevision] = useState<number | null>(null);
  const [error, setError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const query = useQuery({
    queryKey: ["register-times", operationId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/times`, { cache: "no-store", signal });
      if (!response.ok) throw new Error("โหลดเวลาไม่สำเร็จ");
      return response.json() as Promise<Record<TimeField, string | null> & { revision: number }>;
    },
  });
  const revision = savedRevision ?? query.data?.revision ?? null;
  useEffect(() => {
    if (!query.data) return;
    form.reset({
      roomEnteredAt: toLocalInput(query.data.roomEnteredAt),
      operationStartedAt: toLocalInput(query.data.operationStartedAt ?? sourceStartedAt),
      operationEndedAt: toLocalInput(query.data.operationEndedAt ?? sourceEndedAt),
      roomExitedAt: toLocalInput(query.data.roomExitedAt),
    });
  }, [query.data, form, sourceStartedAt, sourceEndedAt]);
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const sourceStart = toLocalInput(sourceStartedAt);
      const sourceEnd = toLocalInput(sourceEndedAt);
      const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/times`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision, times: values, useHosxpTimes: {
          operationStartedAt: Boolean(sourceStart && values.operationStartedAt === sourceStart),
          operationEndedAt: Boolean(sourceEnd && values.operationEndedAt === sourceEnd),
        } }),
      });
      if (response.status === 409) throw new Error("รายการถูกแก้ไขโดยผู้ใช้อื่น กรุณาปิดแล้วเปิดรายการใหม่ก่อนบันทึก");
      if (response.status === 400) throw new Error("โปรดตรวจสอบวันที่และลำดับเวลา");
      if (!response.ok) throw new Error("บันทึกเวลาไม่สำเร็จ กรุณาลองอีกครั้ง");
      return response.json() as Promise<{ revision: number }>;
    },
    onSuccess: (data) => { setSavedRevision(data.revision); toast.success("บันทึกข้อมูลเรียบร้อยแล้ว"); },
  });
  async function save(values: Values) {
    setError("");
    try { await mutation.mutateAsync(values); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกเวลาไม่สำเร็จ"); }
  }
  const saving = mutation.isPending;

  const fallbackDate = operationDate || toLocalInput(sourceStartedAt).slice(0, 10) || toLocalInput(sourceEndedAt).slice(0, 10);
  return <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} title="แก้ไขเวลา" description={`ทะเบียนผ่าตัด · รหัส HOSxP ${operationId}`}>
    {query.isLoading && <EditorSkeleton />}
    {revision !== null && <form className="space-y-5" onSubmit={form.handleSubmit(save)}>
      <p className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">เวลาเริ่ม–เสร็จใช้ค่า HOSxP เป็นค่าเริ่มต้น การแก้ไขจะบันทึกใน OR-Reg หากผ่าตัดข้ามคืน ให้เลือกวันที่สิ้นสุดเป็นวันถัดไป</p>
      {timeGroups.map((group) => <fieldset key={group.title} disabled={saving} className="m-0 min-w-0 rounded-2xl border border-border bg-muted/20 p-3.5 sm:p-4">
        <legend className="px-2 text-sm font-semibold text-foreground">{group.title}</legend><p className="mb-3 mt-0 text-xs leading-5 text-muted-foreground">{group.description}</p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">{group.fields.map((name) => <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => {
          const sourceValue = name === "operationStartedAt" ? sourceStartedAt : name === "operationEndedAt" ? sourceEndedAt : null;
          return <RegisterDateTimeField id={`${id}-${name}`} label={fieldNames[name]} value={field.value} fallbackDate={fallbackDate} onChange={field.onChange} onBlur={field.onBlur} disabled={saving} error={fieldState.error?.message} restoreSource={sourceValue ? () => field.onChange(toLocalInput(sourceValue)) : undefined} />;
        }} />)}</div>
      </fieldset>)}
      {form.formState.errors.root?.message && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{form.formState.errors.root.message}</p>}
      {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>ยกเลิก</Button>
        <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกเวลา"}</Button>
      </div>
    </form>}
    {query.isError && <p className="text-sm text-destructive" role="alert">โหลดข้อมูลเวลาไม่สำเร็จ กรุณาลองใหม่</p>}
  </AppDialog>;
}
