import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SURGIS ARANHOS | ระบบทะเบียนผ่าตัด",
  description: "ระบบทะเบียนผ่าตัดโรงพยาบาล",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
