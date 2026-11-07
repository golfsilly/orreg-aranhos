import type { ReactNode } from "react";

/** Keep wide clinical tables usable with touch, mouse and keyboard. */
export function ResponsiveScroll({ label, children }: { label: string; children: ReactNode }) {
  return <div role="region" aria-label={label} tabIndex={0} className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{children}</div>;
}
