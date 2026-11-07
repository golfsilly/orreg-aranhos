import { CircleHelp } from "lucide-react";

export function WorkspaceFooter() {
  return (
    <footer className="border-t border-border px-4 py-5 sm:px-7 lg:px-9">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          SURGIS ARANHOS <span className="mx-1.5 opacity-40">|</span>{" "}
          โรงพยาบาลอรัญประเทศ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleHelp className="size-3.5" /> หากพบปัญหา กรุณาติดต่อผู้ดูแลระบบ
        </span>
      </div>
    </footer>
  );
}
