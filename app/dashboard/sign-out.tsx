"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true); setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      router.replace("/sign-in");
      router.refresh();
    } catch { setError("ไม่สามารถออกจากระบบได้ โปรดลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  return <div><button type="button" className="cursor-pointer border-0 bg-transparent font-bold text-[#166c5e] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50" onClick={signOut} disabled={pending}>{pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button>{error && <p className="text-sm text-[#a33a36]" role="alert">{error}</p>}</div>;
}
