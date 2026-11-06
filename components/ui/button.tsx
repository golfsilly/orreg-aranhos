import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] font-bold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-[#7dc8b3] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: { default: "bg-[#166c5e] text-white hover:bg-[#10584d]", ghost: "text-[#166c5e] hover:bg-[#eff6f3]" },
    size: { default: "px-5 py-[15px]", sm: "px-3 py-2 text-sm" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

function Button({ className, variant, size, ...props }: Omit<ButtonPrimitive.Props, "className"> & VariantProps<typeof buttonVariants> & { className?: string }) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
