import crypto from "crypto";

export type OtpPurpose = "signup" | "forgot-password";

type OtpEntry = {
  codeHash: string;
  expiresAt: number;
  purpose: OtpPurpose;
  attempts: number;
  used: boolean;
};

const otpStore = new Map<string, OtpEntry>();

const getKey = (email: string, purpose: OtpPurpose) => `${purpose}:${email.toLowerCase().trim()}`;

const hashOtp = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

const safeCompare = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export const createOtp = (email: string, purpose: OtpPurpose) => {
  const normalizedEmail = email.toLowerCase().trim();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const key = getKey(normalizedEmail, purpose);

  otpStore.set(key, {
    codeHash: hashOtp(code),
    expiresAt: Date.now() + 10 * 60 * 1000,
    purpose,
    attempts: 0,
    used: false,
  });

  return { code, expiresAt: Date.now() + 10 * 60 * 1000 };
};

export const verifyOtp = (email: string, purpose: OtpPurpose, code: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const key = getKey(normalizedEmail, purpose);
  const record = otpStore.get(key);

  if (!record || record.used || Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return false;
  }

  if (record.attempts >= 5) {
    otpStore.delete(key);
    return false;
  }

  const isMatch = safeCompare(record.codeHash, hashOtp(code));
  if (!isMatch) {
    record.attempts += 1;
    return false;
  }

  record.used = true;
  return true;
};

export const clearOtp = (email: string, purpose: OtpPurpose) => {
  otpStore.delete(getKey(email, purpose));
};
