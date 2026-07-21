import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email, purpose } = await req.json();

  if (!email || !purpose) {
    return NextResponse.json({ error: "Email and purpose are required" }, { status: 400 });
  }

  if (!["signup", "forgot-password"].includes(purpose)) {
    return NextResponse.json({ error: "Invalid OTP purpose" }, { status: 400 });
  }

  if (purpose === "signup") {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const { code, expiresAt } = createOtp(email, purpose);

  try {
    await sendOtpEmail({ to: email, code, purpose });
  } catch (error) {
    console.error("OTP email send failed", error);
    return NextResponse.json(
      { error: "Unable to send OTP email. Please verify SMTP settings." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "OTP sent successfully",
    expiresAt,
  });
}
