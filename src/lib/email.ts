import nodemailer from "nodemailer";

export type OtpEmailPurpose = "signup" | "forgot-password";

interface SendOtpEmailParams {
  to: string;
  code: string;
  purpose: OtpEmailPurpose;
}

export async function sendOtpEmail({ to, code, purpose }: SendOtpEmailParams) {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || "Wexa <noreply@wexa.ai>";

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const subject = purpose === "signup"
    ? "Verify your Wexa account"
    : "Reset your Wexa password";

  const title = purpose === "signup"
    ? "Verify your account"
    : "Reset your password";

  const text = [
    `Hello,`,
    ``,
    `Your OTP for ${purpose === "signup" ? "account verification" : "password reset"} is: ${code}`,
    `It will expire in 10 minutes.`,
    ``,
    "Thanks,",
    "Wexa Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">${title}</h2>
      <p>Your OTP is:</p>
      <div style="display: inline-block; padding: 12px 18px; margin: 12px 0; font-size: 24px; font-weight: 700; letter-spacing: 3px; background: #f3f4f6; border-radius: 8px;">${code}</div>
      <p>This code will expire in 10 minutes.</p>
      <p>Thanks,<br/>Wexa Team</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}
