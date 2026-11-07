"use client";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

export function AppDialog({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: React.ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" /><Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,900px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[22px] border border-border bg-card text-card-foreground shadow-2xl outline-none"><div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7"><div><Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">{description}</Dialog.Description></div><Dialog.Close aria-label="ปิดหน้าต่าง" className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><X className="size-5" /></Dialog.Close></div><div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">{children}</div></Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
