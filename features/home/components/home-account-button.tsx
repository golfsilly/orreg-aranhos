"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { SignOut } from "@/features/workspace/components/sign-out";
import { authClient } from "@/lib/auth-client";
import { Menu } from "@base-ui/react/menu";
import { ArrowUpRight, LayoutDashboard, LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function HomeAccountButton() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  if (isPending && !session) {
    return (
      <span role="status" aria-label="กำลังตรวจสอบการเข้าสู่ระบบ">
        <Skeleton className="size-11 rounded-full min-[420px]:w-32 sm:w-48" />
      </span>
    );
  }

  const user = session?.user;
  if (!user) {
    return (
      <Link
        href="/signin"
        aria-label="เข้าสู่ระบบ"
        className="group inline-flex size-11 shrink-0 items-center justify-center gap-3 rounded-full border border-primary/30 bg-linear-to-br from-primary to-emerald-800 text-primary-foreground shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring min-[420px]:w-auto min-[420px]:py-1.5 min-[420px]:pr-1.5 min-[420px]:pl-4 dark:border-border dark:from-card dark:to-background dark:text-card-foreground dark:shadow-md"
      >
        <LogIn aria-hidden="true" className="size-[18px] min-[420px]:hidden" />
        <span className="hidden text-[13px] font-semibold min-[420px]:inline">
          เข้าสู่ระบบ
        </span>
        <span
          aria-hidden="true"
          className="hidden size-8 items-center justify-center rounded-full border border-white/10 bg-white/10 min-[420px]:flex dark:border-border/10 dark:bg-accent/[0.08]"
        >
          <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </Link>
    );
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="เปิดเมนูโปรไฟล์"
        className="group relative inline-flex size-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/15 bg-linear-to-b from-card to-primary/[0.035] p-1 text-left shadow-md transition duration-200 hover:border-primary/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring min-[420px]:w-auto min-[420px]:pr-3 sm:gap-2.5 sm:pr-3.5 dark:border-primary/20 dark:from-background dark:to-card dark:shadow-md"
      >
        <span className="relative shrink-0">
          <span className="block overflow-hidden rounded-full border border-primary/10 ring-2 ring-background">
            <ProfileAvatar name={user.name} className="size-8" />
          </span>
          <span
            aria-hidden="true"
            className="absolute right-0 bottom-0 size-2 rounded-full bg-emerald-500 ring-2 ring-background dark:bg-emerald-400"
          />
        </span>
        <span className="hidden text-xs font-semibold min-[420px]:inline sm:hidden">
          โปรไฟล์
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-28 truncate text-xs leading-4 font-semibold">
            {user.name}
          </span>
          <span className="mt-0.5 block text-[9px] leading-3 font-medium text-muted-foreground">
            บัญชีของฉัน
          </span>
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={12}
          className="z-50 outline-none"
        >
          <Menu.Popup className="w-[min(300px,calc(100vw-2rem))] origin-top-right rounded-3xl border border-border/80 bg-popover p-2 text-popover-foreground shadow-md outline-none transition-[opacity,transform] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 dark:shadow-md">
            <div className="mb-1 flex items-center gap-3 rounded-[18px] border border-primary/[0.08] bg-linear-to-br from-primary/[0.08] to-primary/[0.015] p-3.5">
              <span className="shrink-0 overflow-hidden rounded-2xl ring-2 ring-background">
                <ProfileAvatar name={user.name} className="size-11" />
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm leading-5 font-semibold">
                  {user.name}
                </p>
                <p className="m-0 mt-1 truncate text-[11px] text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <Menu.Item
              render={<Link href="/dashboard" />}
              className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 outline-none transition-colors data-[highlighted]:bg-accent"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-muted/60 text-muted-foreground">
                <LayoutDashboard className="size-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">
                  พื้นที่ทำงาน
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  เข้าสู่ Dashboard ของระบบ
                </span>
              </span>
            </Menu.Item>
            <Menu.Item
              onClick={() => router.push("/profile")}
              className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 outline-none transition-colors data-[highlighted]:bg-accent"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/10 bg-primary/[0.055] text-primary">
                <UserRound className="size-[17px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">
                  โปรไฟล์ของฉัน
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  ข้อมูลส่วนตัวและลายเซ็น
                </span>
              </span>
            </Menu.Item>

            <Menu.Separator className="mx-3 my-1 h-px bg-border" />
            <div className="rounded-2xl bg-destructive/[0.035]">
              <SignOut />
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
