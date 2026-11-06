"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: Omit<CheckboxPrimitive.Root.Props, "className"> & { className?: string }) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={cn("relative flex size-5 shrink-0 items-center justify-center rounded border border-[#b6cbc1] bg-white text-white outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[#7dc8b3] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-[#166c5e] data-checked:bg-[#166c5e]", className)} {...props}><CheckboxPrimitive.Indicator data-slot="checkbox-indicator"><CheckIcon className="size-3.5" /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>;
}

export { Checkbox };
