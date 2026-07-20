import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

// GET /api/workspace/members?workspaceId=xxx
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  // Only members can view
  const isMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(members);
}

// POST /api/workspace/members
// body: { workspaceId, email, role }
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, email, role = "agent" } = await req.json();
  if (!workspaceId || !email)
    return NextResponse.json({ error: "workspaceId and email required" }, { status: 400 });

  if (!["owner", "manager", "agent"].includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  // Only owner/manager can add members
  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!requester || !["owner", "manager"].includes(requester.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const member = await prisma.workspaceMember.create({
    data: { workspaceId, userId: target.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}

// DELETE /api/workspace/members
// body: { workspaceId, userId }
export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, userId } = await req.json();
  if (!workspaceId || !userId)
    return NextResponse.json({ error: "workspaceId and userId required" }, { status: 400 });

  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!requester || requester.role !== "owner")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });

  return NextResponse.json({ success: true });
}
