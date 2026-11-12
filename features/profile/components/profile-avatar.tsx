"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/** Authenticated image endpoint is intentionally not sent through Next's image optimizer. */
export function ProfileAvatar({ name, className = "size-10" }: { name: string; className?: string }) {
  const [version, setVersion] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const refresh = () => { setFailed(false); setVersion(Date.now()); };
    window.addEventListener("profile-avatar-updated", refresh);
    return () => window.removeEventListener("profile-avatar-updated", refresh);
  }, []);
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-sm font-bold text-secondary-foreground ${className}`} aria-hidden="true">
    <span>{name.trim().slice(0, 1) || "U"}</span>
    {failed
      ? <Image unoptimized alt="" src="/or-reg-avatar-placeholder.webp" width={256} height={256} className="absolute inset-0 size-full object-cover" />
      : <Image unoptimized alt="" src={`/api/profile/avatar?v=${version}`} width={512} height={512} onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />}
  </span>;
}
