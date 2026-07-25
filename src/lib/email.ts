import nodemailer from "nodemailer";

export type OtpEmailPurpose = "signup" | "forgot-password";

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) throw new Error("SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  return {
    transporter: nodemailer.createTransport({ host, port, secure, auth: { user, pass } }),
    from: process.env.SMTP_FROM?.trim() || "Wexa <noreply@wexa.ai>",
  };
}

export async function sendOtpEmail({ to, code, purpose }: { to: string; code: string; purpose: OtpEmailPurpose }) {
  const { transporter, from } = createTransporter();

  const subject = purpose === "signup" ? "Verify your Wexa account" : "Reset your Wexa password";
  const title = purpose === "signup" ? "Verify your account" : "Reset your password";

  await transporter.sendMail({
    from, to, subject,
    text: `Your OTP for ${purpose === "signup" ? "account verification" : "password reset"} is: ${code}\nIt will expire in 10 minutes.\n\nThanks,\nWexa Team`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">${title}</h2>
        <p>Your OTP is:</p>
        <div style="display: inline-block; padding: 12px 18px; margin: 12px 0; font-size: 24px; font-weight: 700; letter-spacing: 3px; background: #f3f4f6; border-radius: 8px;">${code}</div>
        <p>This code will expire in 10 minutes.</p>
        <p>Thanks,<br/>Wexa Team</p>
      </div>
    `,
  });
}

export async function sendInviteEmail({ to, workspaceName, inviteUrl, role }: {
  to: string; workspaceName: string; inviteUrl: string; role: string;
}) {
  const { transporter, from } = createTransporter();
  await transporter.sendMail({
    from, to,
    subject: `You're invited to join ${workspaceName} on Wexa`,
    text: `You've been invited to join ${workspaceName} as ${role}.\n\nAccept invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 480px;">
        <h2 style="margin-bottom: 8px;">You're invited! 🎉</h2>
        <p>You've been invited to join <strong>${workspaceName}</strong> on Wexa as <strong>${role}</strong>.</p>
        <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">Accept Invite</a>
        <p style="color:#6b7280;font-size:13px;">This link expires in 7 days. If you didn't expect this, ignore this email.</p>
      </div>
    `,
  });
}
