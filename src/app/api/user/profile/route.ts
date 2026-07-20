import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, hashPassword, comparePassword } from "@/lib/auth";

type WorkspaceMembership = {
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  };
};

function getUser(req: NextRequest) {
  const token = req.cookies.get("token")?.value
    ?? req.headers.get("authorization")?.split(" ")[1];
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const auth = getUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: auth.id },
    include: { workspace: { select: { id: true, name: true, slug: true, plan: true, status: true } } },
  });

  return NextResponse.json({
    user: { id: user?.id, name: user?.name, email: user?.email },
    workspace: membership ? { id: membership.workspace.id, name: membership.workspace.name, slug: membership.workspace.slug, plan: membership.workspace.plan } : null,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = getUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, currentPassword, newPassword } = await req.json();
  const updateData: { name?: string; password?: string } = {};

  if (name) updateData.name = name;

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: auth.id } });
    const valid = await comparePassword(currentPassword, user!.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    updateData.password = await hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: auth.id },
    data: updateData,
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json(updated);
}
