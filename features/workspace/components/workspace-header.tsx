"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import type { UserRole } from "@/lib/permissions";
import { Dialog } from "@base-ui/react/dialog";
import { Menu as DropdownMenu } from "@base-ui/react/menu";
import { ChevronRight, Menu, UserRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { roleLabels, workspaceMenu } from "./navigation";
import { SignOut } from "./sign-out";
import { WorkspaceSidebar } from "./workspace-sidebar";

export function WorkspaceHeader({
  user,
}: {
  user: { name: string; role: UserRole };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = workspaceMenu.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:px-7 lg:px-9">
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger
            aria-label="เปิดเมนู"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" />
            <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] overflow-y-auto outline-none">
              <Dialog.Title className="sr-only">เมนูหลัก</Dialog.Title>
              <Dialog.Description className="sr-only">
                เมนูนำทางระบบทะเบียนผ่าตัด
              </Dialog.Description>
              <Dialog.Close
                aria-label="ปิดเมนู"
                className="absolute top-6 right-4 z-10 grid size-9 place-items-center rounded-lg text-[#6b8975] hover:bg-[#e5f1e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25835a] dark:text-[#a8c6b0] dark:hover:bg-white/10"
              >
                <X className="size-5" />
              </Dialog.Close>
              <WorkspaceSidebar
                user={user}
                close={() => setMobileOpen(false)}
              />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="hidden sm:inline">Workspace</span>
            <ChevronRight className="hidden size-3 sm:block" />
            <span className="truncate text-foreground">
              {current?.label ?? "ระบบทะเบียนผ่าตัด"}
            </span>
          </div>
        </div>
        <ThemeToggle />
        <div className="mx-1 hidden h-8 w-px bg-border sm:block" />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label="เปิดเมนูบัญชีผู้ใช้"
            className="group flex min-w-0 items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-3 sm:px-2"
          >
            <div className="hidden min-w-0 text-right sm:block">
              <div className="max-w-[180px] truncate text-xs font-semibold">
                {user.name}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {roleLabels[user.role]}
              </div>
            </div>
            <ProfileAvatar name={user.name} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Positioner
              side="bottom"
              align="end"
              sideOffset={8}
              className="z-50 outline-none"
            >
              <DropdownMenu.Popup className="w-64 origin-top-right rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl shadow-black/10 outline-none data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 dark:shadow-black/30">
                <div className="flex items-center gap-3 px-3 py-3">
                  <ProfileAvatar name={user.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {roleLabels[user.role]}
                    </p>
                  </div>
                </div>
                <div className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  onClick={() => router.push("/profile")}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <UserRound className="size-4 text-muted-foreground" />
                  โปรไฟล์ของฉัน
                </DropdownMenu.Item>
                <SignOut />
              </DropdownMenu.Popup>
            </DropdownMenu.Positioner>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
