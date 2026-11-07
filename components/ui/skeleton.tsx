import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)} {...props} />;
}

export function LoadingRegion({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div role="status" aria-live="polite" aria-label={label} className={className}><span className="sr-only">{label}</span>{children}</div>;
}
