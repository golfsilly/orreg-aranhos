"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

function RadioGroup<Value>({ className, ...props }: Omit<RadioGroupPrimitive.Props<Value>, "className"> & { className?: string }) {
  return <RadioGroupPrimitive data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: Omit<RadioPrimitive.Root.Props, "className"> & { className?: string }) {
  return <RadioPrimitive.Root data-slot="radio-group-item" className={cn("relative flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-card text-primary outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary", className)} {...props}><RadioPrimitive.Indicator data-slot="radio-group-indicator" className="flex items-center justify-center"><span className="size-2.5 rounded-full bg-current" /></RadioPrimitive.Indicator></RadioPrimitive.Root>;
}

export { RadioGroup, RadioGroupItem };
