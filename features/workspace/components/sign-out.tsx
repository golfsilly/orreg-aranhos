"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "@base-ui/react/menu";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function SignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      queryClient.clear();
      router.replace("/signin");
      router.refresh();
    } catch { toast.error("ไม่สามารถออกจากระบบได้ โปรดลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  return <Menu.Item onClick={signOut} disabled={pending} className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-destructive outline-none transition-colors data-[highlighted]:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50">
    <LogOut className="size-4" />{pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
  </Menu.Item>;
}
