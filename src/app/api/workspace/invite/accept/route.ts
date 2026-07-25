import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, name, password } = await req.json();
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
  if (!invite || invite.accepted || invite.expiresAt < new Date())
    return NextResponse.json({ error: "Invite link is invalid or expired" }, { status: 400 });

  // Find or create user
  let dbUser = await prisma.user.findUnique({ where: { email: invite.email } });

  if (!dbUser) {
    // New user — name + password required
    if (!name?.trim() || !password?.trim())
      return NextResponse.json({ error: "Name and password required for new accounts" }, { status: 400 });
    const hashed = await hashPassword(password);
    dbUser = await prisma.user.create({ data: { name: name.trim(), email: invite.email, password: hashed } });
  }

  // Add to workspace (ignore if already member)
  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: dbUser.id } },
    update: { role: invite.role },
    create: { workspaceId: invite.workspaceId, userId: dbUser.id, role: invite.role },
  });

  // Mark invite accepted
  await prisma.workspaceInvite.update({ where: { token }, data: { accepted: true } });

  // Auto-login with role in token
  const authToken = signToken({ id: dbUser.id, email: dbUser.email, role: invite.role });
  const res = NextResponse.json({ success: true });
  res.cookies.set("token", authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

// GET — validate token (for page load)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });

  if (!invite || invite.accepted || invite.expiresAt < new Date())
    return NextResponse.json({ error: "Invite link is invalid or expired" }, { status: 400 });

  const userExists = await prisma.user.findUnique({ where: { email: invite.email } });

  return NextResponse.json({
    email: invite.email,
    workspaceName: invite.workspace.name,
    role: invite.role,
    userExists: !!userExists,
  });
}
