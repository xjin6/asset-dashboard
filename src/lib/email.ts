import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.qq.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,  // QQ邮箱授权码，不是QQ密码
  },
});

export async function sendEmail({
  subject,
  html,
}: {
  subject: string;
  html: string;
}) {
  const to = process.env.EMAIL_TO ?? process.env.EMAIL_USER;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[Email] EMAIL_USER or EMAIL_PASS not configured, skipping.");
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
  console.log(`[Email] Sent: ${subject}`);
}
