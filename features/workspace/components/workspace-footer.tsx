import Image from "next/image";

export function WorkspaceFooter() {
  return (
    <footer className="border-t border-border/70 py-5 sm:py-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-9">
        <div className="flex items-center gap-3">
          <Image
            src="/aranhos-logo/logo-aranhos.png"
            alt="โรงพยาบาลอรัญประเทศ"
            width={30}
            height={30}
            className="size-[30px] object-contain"
          />
          <span aria-hidden="true" className="h-6 w-px bg-border" />
          <Image
            src="/moph-logo/moph-logo.png"
            alt="กระทรวงสาธารณสุข"
            width={26}
            height={30}
            className="h-[30px] w-[26px] object-contain"
          />
          <span className="ml-1">
            <span className="block text-[11px] font-semibold text-foreground">
              โรงพยาบาลอรัญประเทศ
            </span>
            <span className="block text-[9px] text-muted-foreground">
              Aranyaprathet Hospital
            </span>
          </span>
        </div>

        <p className="m-0 text-[10px] leading-5 text-muted-foreground sm:text-right">
          Crafted by กลุ่มงานสุขภาพดิจิทัล โรงพยาบาลอรัญประเทศ
        </p>
      </div>
    </footer>
  );
}
