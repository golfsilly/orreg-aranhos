"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { parseRegisterTimes, timeFields, type TimeField } from "@/lib/register/times";
import { EditorSkeleton } from "./operations-skeleton";

const names: Record<TimeField, string> = { roomEnteredAt: "เข้าห้องผ่าตัด", operationStartedAt: "เริ่มผ่าตัด", operationEndedAt: "สิ้นสุดผ่าตัด", roomExitedAt: "ออกจากห้องผ่าตัด" };
const blank = { roomEnteredAt: "", operationStartedAt: "", operationEndedAt: "", roomExitedAt: "" };
const schema = z.object({ roomEnteredAt: z.string(), operationStartedAt: z.string(), operationEndedAt: z.string(), roomExitedAt: z.string() }).refine((value) => { try { parseRegisterTimes(value); return true; } catch { return false; } }, "โปรดตรวจสอบวันที่และลำดับเวลาเข้าห้อง เริ่มผ่าตัด สิ้นสุดผ่าตัด และออกจากห้อง");
type Values = z.infer<typeof schema>;
const bangkokInput = (value: unknown) => typeof value === "string" ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : "";

export function TimesEditor({ operationId, onClose }: { operationId: string; onClose: () => void }) {
  const [savedRevision, setSavedRevision] = useState<number | null>(null);
  const [error, setError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: blank });
  const { reset } = form;
  const query = useQuery({ queryKey: ["register-times", operationId], queryFn: async ({ signal }) => {
    const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/times`, { cache: "no-store", signal });
    if (!response.ok) throw new Error();
    return response.json() as Promise<Record<TimeField, string | null> & { revision: number }>;
  } });
  const revision = savedRevision ?? query.data?.revision ?? null;
  useEffect(() => {
    if (!query.data) return;
    reset(Object.fromEntries(timeFields.map((field) => [field, bangkokInput(query.data[field])])) as Values);
  }, [query.data, reset]);
  const mutation = useMutation({ mutationFn: async (times: Values) => {
    const response = await fetch(`/api/register/${encodeURIComponent(operationId)}/times`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision, times }) });
    if (response.status === 409) throw new Error("รายการถูกแก้ไขโดยผู้ใช้อื่น โปรดปิดและเปิดรายการใหม่ก่อนบันทึก");
    if (response.status === 400) throw new Error("โปรดตรวจสอบวันที่และลำดับเวลา");
    if (!response.ok) throw new Error("ไม่สามารถบันทึกเวลาได้ โปรดลองอีกครั้ง");
    return response.json() as Promise<{ revision: number }>;
  }, onSuccess: (data) => { setSavedRevision(data.revision); toast.success("บันทึกเวลาเรียบร้อยแล้ว"); } });
  async function save(values: Values) { setError(""); try { await mutation.mutateAsync(values); } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึกเวลาได้"); } }
  const saving = mutation.isPending;
  const validationError = form.formState.errors.root?.message;
  return <section className="mt-[34px] border-t border-border pt-5 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2_span]:ml-2 [&_h2_span]:text-[13px] [&_h2_span]:font-normal [&_h2_span]:text-muted-foreground" aria-labelledby="time-editor-title">
    <div className="flex items-center justify-between gap-3"><h2 id="time-editor-title">แก้ไขเวลา <span>รหัสผ่าตัด {operationId}</span></h2><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50" onClick={onClose} disabled={saving}>ปิด</button></div>
    <p className="leading-[1.8] text-muted-foreground">ระบุวันที่และเวลาท้องถิ่นประเทศไทย หากวันผ่าตัดเปลี่ยน โปรดตรวจสอบเวลาที่บันทึกไว้เดิม</p>
    {query.isLoading && <EditorSkeleton />}
    {revision !== null && <form onSubmit={form.handleSubmit(save)}><div className="grid grid-cols-2 gap-x-[18px] max-[600px]:grid-cols-1 [&_label]:min-w-0">{timeFields.map((field) => <label className="mt-5 block text-sm font-bold" key={field}>{names[field]}<input className="mt-2 block w-full rounded-lg border border-input p-[13px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring" type="datetime-local" {...form.register(field)} disabled={saving} /></label>)}</div><button className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-primary px-5 py-[15px] font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกเวลา"}</button></form>}
    {(error || query.isError || validationError) && <p className="text-sm text-destructive" role="alert">{error || validationError || "ไม่สามารถโหลดเวลาผ่าตัดได้"}</p>}
  </section>;
}
