import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { verifyOtp, clearOtp } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const { email, otp, password } = await req.json();

  if (!email || !otp || !password) {
    return NextResponse.json({ error: "Email, OTP, and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = verifyOtp(email, "forgot-password", otp);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  const hashed = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
  clearOtp(email, "forgot-password");

  return NextResponse.json({ success: true, message: "Password reset successfully" });
}
