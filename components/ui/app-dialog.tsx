"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
  size?: "default" | "wide";
  footer?: ReactNode;
};

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  eyebrow,
  size = "default",
  footer,
}: AppDialogProps) {
  const isWide = size === "wide";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[3px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={[
            "fixed top-1/2 left-1/2 z-50 flex max-h-[min(92dvh,960px)] w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border border-border/80 bg-card text-card-foreground shadow-2xl shadow-black/15 outline-none transition-[opacity,transform] duration-200 data-[ending-style]:scale-[0.985] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.985] data-[starting-style]:opacity-0 sm:w-[calc(100%-2rem)] dark:shadow-black/40",
            isWide
              ? "max-w-5xl rounded-[26px] sm:rounded-[30px]"
              : "max-w-2xl rounded-[22px]",
          ].join(" ")}
        >
          <div
            className={[
              "flex shrink-0 items-start justify-between gap-4 border-b border-border/75 px-4 py-4 sm:px-6 sm:py-5",
              eyebrow
                ? "bg-gradient-to-r from-primary/[0.065] via-card to-card"
                : "bg-card",
            ].join(" ")}
          >
            <div className="min-w-0">
              {eyebrow && (
                <p className="m-0 mb-1.5 text-[9px] font-bold tracking-[0.17em] text-primary sm:text-[10px]">
                  {eyebrow}
                </p>
              )}
              <Dialog.Title className="m-0 text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </Dialog.Title>
              <Dialog.Description className="m-0 mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="ปิดหน้าต่าง"
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground transition hover:border-primary/20 hover:bg-primary/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:size-10"
            >
              <X aria-hidden="true" className="size-4.5" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t border-border/75 bg-card/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-3.5">
              {footer}
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
