import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value
    ?? req.headers.get("authorization")?.split(" ")[1]; // fallback for backward compat
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function getWorkspaceId(userId: string) {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return m?.workspaceId ?? null;
}

// Always store phone with + prefix e.g. +917768011038
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return "+" + digits;
}
