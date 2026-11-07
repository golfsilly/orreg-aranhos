import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/features/shared/components/providers";

export const metadata: Metadata = {
  title: "SURGIS ARANHOS | ระบบทะเบียนผ่าตัด",
  description: "ระบบทะเบียนผ่าตัดโรงพยาบาล",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", type: "image/x-icon", sizes: "any" },
      { url: "/favicon/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
