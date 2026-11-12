"use client";

import Image from "next/image";
import { useState } from "react";

export function UserAvatar({ userId, hasAvatar, className }: { userId: string; hasAvatar: boolean; className: string }) {
  const [failed, setFailed] = useState(false);
  const src = hasAvatar && !failed ? `/api/users/${encodeURIComponent(userId)}/avatar` : "/or-reg-avatar-placeholder.webp";
  return (
    <span aria-hidden="true" className={`relative grid shrink-0 place-items-center overflow-hidden bg-secondary ${className}`}>
      <Image alt="" unoptimized src={src} width={256} height={256} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
    </span>
  );
}
