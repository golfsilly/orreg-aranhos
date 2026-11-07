import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export function isMailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASSWORD);
}

export async function sendPasswordReset(email: string, url: string) {
  if (!isMailConfigured()) throw new Error("SMTP is not configured");
  const port = env.SMTP_PORT!;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure: port === 465,
    requireTLS: port !== 465,
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  await transport.sendMail({
    from: env.SMTP_FROM, to: email,
    subject: "ตั้งรหัสผ่านใหม่ | SURGIS ARANHOS",
    text: `มีคำขอตั้งรหัสผ่านใหม่สำหรับบัญชี SURGIS ARANHOS\n\nเปิดลิงก์เพื่อตั้งรหัสผ่านใหม่: ${url}\n\nหากคุณไม่ได้ส่งคำขอนี้ สามารถละเลยอีเมลฉบับนี้ได้`,
  });
}
