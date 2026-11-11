"use client";

import type { UserRole } from "@/lib/permissions";
import { useState } from "react";
import { WorkspaceFooter } from "./workspace-footer";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceSidebar } from "./workspace-sidebar";

export function WorkspaceShell({
  user,
  enabledModules,
  children,
}: {
  user: { name: string; role: UserRole };
  enabledModules: readonly string[];
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = !sidebarCollapsed || sidebarHovered;

  return (
    <div className={`min-h-screen bg-background text-foreground transition-[padding] duration-300 ${sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-[272px]"}`}>
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        onFocusCapture={() => setSidebarHovered(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSidebarHovered(false);
        }}
        className={`fixed inset-y-0 left-0 z-30 hidden overflow-y-auto transition-[width] duration-300 ease-out lg:block ${sidebarExpanded ? "w-[272px] shadow-md" : "w-[72px]"}`}
      >
        <WorkspaceSidebar
          user={user}
          enabledModules={enabledModules}
          collapsed={!sidebarExpanded}
          onToggleCollapsed={() => {
            setSidebarHovered(false);
            setSidebarCollapsed((current) => !current);
          }}
        />
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col">
        <WorkspaceHeader user={user} enabledModules={enabledModules} />
        <main
          id="main-content"
          className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 py-7 sm:px-7 sm:py-9 lg:px-9"
        >
          {children}
        </main>
        <WorkspaceFooter />
      </div>
    </div>
  );
}
