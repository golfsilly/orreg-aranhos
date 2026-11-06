import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f8f5] bg-[radial-gradient(circle_at_85%_12%,#dcefe6,transparent_34%)] px-6 py-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-center gap-3 text-base font-extrabold tracking-[0.1em] [&_small]:block [&_small]:text-[10px] [&_small]:tracking-[0.23em] [&_small]:text-[#71918b]">
          <span className="grid size-[42px] place-items-center rounded-[14px] bg-[#166c5e] text-[26px] text-white">+</span>
          <span>
            SURGIS <small>ARANHOS</small>
          </span>
        </div>
        <div className="max-w-[730px] pt-[150px] pb-[100px] max-[600px]:pt-[110px] max-[600px]:pb-[75px]">
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#4c887a]">SURGERY INFORMATION SYSTEM</span>
          <h1 className="mt-5 mb-3 text-[clamp(38px,6vw,66px)] leading-[1.2] font-bold tracking-[-0.03em]">ระบบทะเบียนผ่าตัด</h1>
          <p className="leading-[1.8] text-[#65817c]">พื้นที่ทำงานสำหรับบันทึกและติดตามข้อมูลการผ่าตัดของโรงพยาบาล</p>
          <Link href="/sign-in" className="mt-[22px] inline-flex cursor-pointer items-center justify-center gap-8 rounded-[10px] border-0 bg-[#166c5e] px-5 py-[15px] font-bold text-white no-underline hover:bg-[#10584d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#7dc8b3] disabled:cursor-not-allowed disabled:opacity-50">
            เข้าสู่ระบบ <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="border-t border-[#d5e5dc] pt-[22px] text-[13px] leading-[1.8] text-[#6a817a]">
          <strong>ระบบอยู่ระหว่างพัฒนา</strong>
          <br />
          ยังไม่พร้อมใช้บันทึกข้อมูลผู้ป่วยจริง
        </div>
      </div>
    </main>
  );
}
