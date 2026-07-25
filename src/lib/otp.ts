import crypto from "crypto";
import { prisma } from "./prisma";

export type OtpPurpose = "signup" | "forgot-password";

// Problem 1: hashOtp used plain string — must use hex consistently for safeCompare
const hashOtp = (code: string): string =>
  crypto.createHash("sha256").update(code.trim()).digest("hex");

// Problem 2: safeCompare would throw if lengths differ after encoding — fixed with try/catch
const safeCompare = (a: string, b: string): boolean => {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

export const createOtp = async (email: string, purpose: OtpPurpose) => {
  // Problem 3: Math.random() is not cryptographically secure for OTP generation
  const codeNum = crypto.randomInt(100000, 999999);
  const code = String(codeNum);

  const key = `${purpose}:${email.toLowerCase().trim()}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Problem 4: hashOtp called twice (update + create) — compute once
  const codeHash = hashOtp(code);

  await prisma.otpStore.upsert({
    where: { key },
    update: { codeHash, expiresAt, attempts: 0, used: false },
    create: { key, codeHash, expiresAt, attempts: 0, used: false },
  });

  // Problem 5: returned expiresAt was a number (Date.now()) not a Date — now consistent
  return { code, expiresAt: expiresAt.getTime() };
};

export const verifyOtp = async (email: string, purpose: OtpPurpose, code: string) => {
  // Problem 6: no input validation — empty code could pass hash check on corrupt DB rows
  if (!code || !email) return false;

  const key = `${purpose}:${email.toLowerCase().trim()}`;
  const record = await prisma.otpStore.findUnique({ where: { key } });

  if (!record || record.used || record.expiresAt < new Date()) {
    if (record) await prisma.otpStore.delete({ where: { key } }).catch(() => {});
    return false;
  }

  if (record.attempts >= 5) {
    await prisma.otpStore.delete({ where: { key } }).catch(() => {});
    return false;
  }

  const isMatch = safeCompare(record.codeHash, hashOtp(code));
  if (!isMatch) {
    await prisma.otpStore.update({ where: { key }, data: { attempts: { increment: 1 } } });
    return false;
  }

  // Problem 7: after successful verify, record was only marked used but never cleaned up
  // — delete it immediately so it can't be replayed even if used=true check fails
  await prisma.otpStore.delete({ where: { key } }).catch(() => {});
  return true;
};

export const clearOtp = async (email: string, purpose: OtpPurpose) => {
  const key = `${purpose}:${email.toLowerCase().trim()}`;
  await prisma.otpStore.delete({ where: { key } }).catch(() => {});
};
