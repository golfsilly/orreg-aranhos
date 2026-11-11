import {
  globalWorkspaceMenu,
  workspaceModules,
} from "@/features/workspace/components/navigation";
import { hasPermission, type UserRole } from "@/lib/permissions";
import { ArrowRight, Blocks, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function SystemDashboard({
  user,
}: {
  user: { name: string; role: UserRole };
}) {
  const modules = workspaceModules
    .map((module) => ({
      ...module,
      items: module.items.filter((item) =>
        hasPermission(user.role, item.permission),
      ),
    }))
    .filter((module) => module.items.length > 0);
  const availableTools = globalWorkspaceMenu.filter((item) =>
    hasPermission(user.role, item.permission),
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-background via-card to-card p-6 shadow-md dark:border-border dark:from-background sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> SYSTEM
            WORKSPACE
          </p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.035em] sm:text-[38px]">
            ยินดีต้อนรับ {user.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            เลือกโมดูลที่ต้องการใช้งานจากภาพรวมระบบ
            โมดูลและเมนูจะแสดงตามสิทธิ์บัญชีของคุณ
          </p>
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-primary">
              YOUR WORKSPACE
            </p>
            <h2
              id="modules-heading"
              className="mt-1 text-xl font-semibold tracking-tight"
            >
              โมดูลระบบ
            </h2>
          </div>
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {modules.length} โมดูล
          </span>
        </div>
        {modules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
            ยังไม่มีโมดูลที่เปิดให้บัญชีของคุณใช้งาน
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;
              const dashboard =
                module.items.find((item) => item.label.includes("ภาพรวม")) ??
                module.items[0];
              return (
                <article
                  key={module.id}
                  className="group relative overflow-hidden rounded-[22px] border border-border bg-card p-5 shadow-md transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold tracking-[0.16em] text-primary">
                        {module.subtitle}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        {module.label}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        เข้าสู่พื้นที่ทำงาน
                      </p>
                    </div>
                    <Blocks className="size-5 text-muted-foreground/50" />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    <Link
                      href={dashboard.href}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      เปิดแดชบอร์ด <ArrowRight className="size-4" />
                    </Link>
                    {module.items
                      .filter((item) => item.href !== dashboard.href)
                      .map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-accent"
                        >
                          {item.label}
                        </Link>
                      ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {availableTools.length > 0 && (
        <section className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">บัญชีและระบบ</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                เครื่องมือที่เปิดให้บัญชีของคุณ
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableTools.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-medium transition hover:bg-accent"
                >
                  <Icon className="size-4 text-primary" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
