"use client";
import type { FieldValues, Path, UseFormRegister } from "react-hook-form";

export const workLabels = [
  ["organization", "องค์กร"], ["mission", "ภารกิจ"], ["workGroup", "กลุ่มงาน"], ["jobTitle", "ตำแหน่ง"], ["jobLevel", "ระดับตำแหน่ง"],
] as const;
const inputClass = "mt-2 block h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export function WorkFields<T extends FieldValues>({ register, disabled = false }: { register: UseFormRegister<T>; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0"><legend className="text-sm font-semibold">หน่วยงานและตำแหน่ง <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span></legend><div className="mt-1 grid gap-x-4 sm:grid-cols-2">{workLabels.map(([field, label]) => <label key={field} className="mt-4 block min-w-0 text-sm font-medium">{label}<input {...register(field as Path<T>)} maxLength={191} className={inputClass} placeholder={`ระบุ${label}`} /></label>)}</div></fieldset>;
}
