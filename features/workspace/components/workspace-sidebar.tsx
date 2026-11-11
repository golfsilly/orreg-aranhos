"use client";

import { hasPermission, type UserRole } from "@/lib/permissions";
import { BRAND } from "@/lib/brand";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  globalWorkspaceMenu,
  systemDashboardItem,
  workspaceModules,
  type WorkspaceMenuItem,
} from "./navigation";

type WorkspaceUser = { name: string; role: UserRole };

function SidebarLink({
  item,
  pathname,
  close,
  collapsed = false,
}: {
  item: WorkspaceMenuItem;
  pathname: string;
  close?: () => void;
  collapsed?: boolean;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={close}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`group relative flex min-h-10 items-center rounded-xl py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25835a] dark:focus-visible:outline-[#a2e9b8] ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-[#e1f1e5] text-[#145b39] dark:bg-[#234733] dark:text-[#d9f8e3]" : "text-[#5a7665] hover:bg-[#eaf3ec] hover:text-[#1b6140] dark:text-[#a9c2b0] dark:hover:bg-white/[0.06] dark:hover:text-[#f0fbf3]"}`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-[#248353] dark:bg-[#9be1b0]"
        />
      )}
      <Icon
        aria-hidden="true"
        className={`size-[17px] shrink-0 ${active ? "text-[#248353] dark:text-[#a8eabc]" : "text-[#86a190] dark:text-[#86a590]"}`}
        strokeWidth={1.8}
      />
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1"}>
        {item.label}
      </span>
    </Link>
  );
}

export function WorkspaceSidebar({
  user,
  enabledModules,
  close,
  collapsed = false,
  onToggleCollapsed,
}: {
  user: WorkspaceUser;
  enabledModules: readonly string[];
  close?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const modules = workspaceModules
    .filter((module) => enabledModules.includes(module.id))
    .map((module) => ({
      ...module,
      items: module.items.filter((item) =>
        hasPermission(user.role, item.permission),
      ),
    }))
    .filter((module) => module.items.length > 0);
  const activeModules = modules
    .filter((module) =>
      module.items.some(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    )
    .map((module) => module.id);
  const [openModules, setOpenModules] = useState<string[]>(activeModules);
  const globalItems = globalWorkspaceMenu.filter((item) =>
    hasPermission(user.role, item.permission),
  );

  return (
    <div
      className={`relative isolate flex min-h-full flex-col overflow-hidden border-r border-[#dce9df] bg-[#f8fbf8] text-[#183d2c] dark:border-white/[0.08] dark:bg-[#0b1911] dark:text-[#e8f4eb] ${collapsed ? "items-center" : ""}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-28 -z-10 size-72 rounded-full bg-[#8bcba2]/15 blur-3xl dark:bg-[#408c60]/10"
      />
      <div
        className={`mt-5 flex w-full items-center ${collapsed ? "flex-col justify-center gap-2 px-2" : "justify-between px-4"}`}
      >
        <Link
          href="/"
          onClick={close}
          aria-label="ไปหน้าหลัก"
          className={`group flex min-w-0 items-center rounded-2xl py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25835a] dark:focus-visible:outline-[#a2e9b8] ${collapsed ? "justify-center px-0" : "gap-3 px-2"}`}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-white p-1 shadow-[0_7px_16px_#1d6d4520]">
            <Image
              src={BRAND.logoPath}
              alt=""
              width={44}
              height={44}
              className="size-full object-contain"
            />
          </span>
          <span className={collapsed ? "sr-only" : "min-w-0"}>
            <span className="block text-[15px] leading-none font-extrabold tracking-[0.14em] text-[#12472f] dark:text-[#e7f7eb]">
              {BRAND.wordmark}
            </span>
            <span className="mt-1.5 block text-[9px] leading-none font-semibold tracking-[0.18em] text-[#718c7b] dark:text-[#91b49d]">
              OPERATING ROOM WORKSPACE
            </span>
          </span>
        </Link>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-[#6b8975] transition-colors hover:bg-[#e5f1e7] hover:text-[#176c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25835a] dark:text-[#a8c6b0] dark:hover:bg-white/10 dark:hover:text-[#c9f0d2]"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        )}
      </div>

      <div className="mx-6 mt-5 h-px bg-gradient-to-r from-[#c7ddcd] via-[#dce9df] to-transparent dark:from-white/15 dark:via-white/5" />
      <nav
        aria-label="เมนูหลัก"
        className={`relative w-full flex-1 pt-7 pb-5 ${collapsed ? "px-2" : "px-4"}`}
      >
        <div
          className={`mb-3 flex items-center justify-between px-2 ${collapsed ? "sr-only" : ""}`}
        >
          <span className="text-[11px] font-bold text-[#718b7b] dark:text-[#a5c0ad]">
            ระบบงาน
          </span>
          <span
            aria-hidden="true"
            className="text-[9px] font-semibold tracking-[0.14em] text-[#a2b6a8] dark:text-[#64836d]"
          >
            MODULES
          </span>
        </div>
        {hasPermission(user.role, systemDashboardItem.permission) && (
          <div className="mb-3">
            <SidebarLink
              item={systemDashboardItem}
              pathname={pathname}
              close={close}
              collapsed={collapsed}
            />
          </div>
        )}
        {collapsed ? (
          <div className="space-y-2">
            {modules.map((module) => {
              const ModuleIcon = module.icon;
              const dashboardItem =
                module.items.find((item) => item.label.includes("ภาพรวม")) ??
                module.items[0];
              const active = module.items.some(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`),
              );
              return (
                <Link
                  key={module.id}
                  href={dashboardItem.href}
                  onClick={close}
                  title={module.label}
                  aria-label={module.label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative grid min-h-[52px] place-items-center rounded-2xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25835a] dark:focus-visible:outline-[#a2e9b8] ${active ? "border-[#bdddc5] bg-[#eaf5ec] dark:border-[#39654a] dark:bg-[#183528]" : "border-transparent hover:border-[#d7e8db] hover:bg-white/80 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.07]"}`}
                >
                  <ModuleIcon
                    className={`size-[19px] ${active ? "text-[#248353] dark:text-[#a8eabc]" : "text-[#86a190] dark:text-[#86a590]"}`}
                    strokeWidth={1.8}
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <Accordion.Root
            multiple
            value={openModules}
            onValueChange={setOpenModules}
            className="space-y-2"
          >
            {modules.map((module) => {
              const ModuleIcon = module.icon;
              return (
                <Accordion.Item key={module.id} value={module.id}>
                  <Accordion.Header>
                    <Accordion.Trigger className="group flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-[#d7e8db] bg-white/80 px-3 py-2 text-left shadow-[0_4px_14px_#1d6d4508] transition-colors hover:border-[#bdddc5] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25835a] data-[panel-open]:border-[#bdddc5] data-[panel-open]:bg-[#eaf5ec] dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:focus-visible:outline-[#a2e9b8] dark:data-[panel-open]:border-[#39654a] dark:data-[panel-open]:bg-[#183528]">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#176c49] text-[#e5f9ea] shadow-[0_4px_12px_#176c4924] dark:bg-[#b8ecc7] dark:text-[#12452a]">
                        <ModuleIcon className="size-[19px]" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-[#194b31] dark:text-[#e0f4e5]">
                          {module.label}
                        </span>
                        <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.11em] text-[#829f8b] dark:text-[#8fae99]">
                          {module.subtitle}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[#6a9477] transition-transform duration-200 group-data-[panel-open]:rotate-180 dark:text-[#a1cdb0]"
                      />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className="overflow-hidden">
                    <div className="mt-2 ml-5 space-y-1 border-l border-[#d3e6d7] pl-3 dark:border-[#365745]">
                      {module.items.map((item) => (
                        <SidebarLink
                          key={item.href}
                          item={item}
                          pathname={pathname}
                          close={close}
                        />
                      ))}
                    </div>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion.Root>
        )}
        {globalItems.length > 0 && (
          <section aria-label="บัญชีและระบบ" className="mt-7">
            <div
              className={`mb-3 flex items-center justify-between px-2 ${collapsed ? "sr-only" : ""}`}
            >
              <span className="text-[11px] font-bold text-[#718b7b] dark:text-[#a5c0ad]">
                บัญชีและระบบ
              </span>
              <span
                aria-hidden="true"
                className="text-[9px] font-semibold tracking-[0.14em] text-[#a2b6a8] dark:text-[#64836d]"
              >
                ACCOUNT
              </span>
            </div>
            <div className="space-y-1">
              {globalItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  close={close}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </section>
        )}
      </nav>
    </div>
  );
}
