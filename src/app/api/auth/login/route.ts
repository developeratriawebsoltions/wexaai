import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await comparePassword(password, user.password);
  if (!valid)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, role: "owner" },
    include: { workspace: true },
  });

  const token = signToken({ id: user.id, email: user.email });

  const res = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    workspace: membership ? { id: membership.workspace.id, name: membership.workspace.name, slug: membership.workspace.slug, plan: membership.workspace.plan } : null,
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}
