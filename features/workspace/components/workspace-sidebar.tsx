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
      className={`group relative flex min-h-10 items-center rounded-xl py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground dark:text-muted-foreground dark:hover:bg-white/[0.06] dark:hover:text-foreground"}`}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-primary"
        />
      )}
      <Icon
        aria-hidden="true"
        className={`size-[17px] shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
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
      className={`relative isolate flex min-h-full flex-col overflow-hidden border-r border-border bg-card text-foreground dark:border-border dark:bg-card ${collapsed ? "items-center" : ""}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-28 -z-10 size-72 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        className={`mt-5 flex w-full items-center ${collapsed ? "flex-col justify-center gap-2 px-2" : "justify-between px-4"}`}
      >
        <Link
          href="/"
          onClick={close}
          aria-label="ไปหน้าหลัก"
          className={`group flex min-w-0 items-center rounded-2xl py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:focus-visible:outline-ring ${collapsed ? "justify-center px-0" : "gap-3 px-2"}`}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-white p-1 shadow-md">
            <Image
              src={BRAND.logoPath}
              alt=""
              width={44}
              height={44}
              className="size-full object-contain"
            />
          </span>
          <span className={collapsed ? "sr-only" : "min-w-0"}>
            <span className="block text-[15px] leading-none font-extrabold tracking-[0.14em] text-foreground">
              {BRAND.wordmark}
            </span>
            <span className="mt-1.5 block text-[9px] leading-none font-semibold tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">
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
            className="grid size-9 shrink-0 place-items-center rounded-xl text-primary transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-primary dark:hover:bg-white/10 dark:hover:text-primary"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        )}
      </div>

      <div className="mx-6 mt-5 h-px bg-gradient-to-r from-background via-card to-transparent dark:from-white/15 dark:via-white/5" />
      <nav
        aria-label="เมนูหลัก"
        className={`relative w-full flex-1 pt-7 pb-5 ${collapsed ? "px-2" : "px-4"}`}
      >
        <div
          className={`mb-3 flex items-center justify-between px-2 ${collapsed ? "sr-only" : ""}`}
        >
          <span className="text-[11px] font-bold text-muted-foreground dark:text-muted-foreground">
            ระบบงาน
          </span>
          <span
            aria-hidden="true"
            className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground dark:text-muted-foreground"
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
                  className={`group relative grid min-h-[52px] place-items-center rounded-2xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:focus-visible:outline-ring ${active ? "border-primary/20 bg-primary/5 dark:border-primary/20 dark:bg-primary/10" : "border-transparent hover:border-border hover:bg-white/80 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.07]"}`}
                >
                  <ModuleIcon
                    className={`size-[19px] ${active ? "text-primary" : "text-muted-foreground"}`}
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
                    <Accordion.Trigger className="group flex min-h-[60px] w-full items-center gap-3 rounded-2xl border border-border bg-white/80 px-3 py-2 text-left shadow-md transition-colors hover:border-border hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[panel-open]:border-border data-[panel-open]:bg-accent dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.07] dark:focus-visible:outline-ring dark:data-[panel-open]:border-border dark:data-[panel-open]:bg-accent">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm dark:bg-primary/15 dark:text-primary">
                        <ModuleIcon className="size-[19px]" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-foreground dark:text-primary">
                          {module.label}
                        </span>
                        <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.11em] text-muted-foreground dark:text-muted-foreground">
                          {module.subtitle}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary transition-transform duration-200 group-data-[panel-open]:rotate-180 dark:text-primary"
                      />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Panel className="overflow-hidden">
                    <div className="mt-2 ml-5 space-y-1 border-l border-border pl-3 dark:border-border">
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
              <span className="text-[11px] font-bold text-muted-foreground dark:text-muted-foreground">
                บัญชีและระบบ
              </span>
              <span
                aria-hidden="true"
                className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground dark:text-muted-foreground"
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
