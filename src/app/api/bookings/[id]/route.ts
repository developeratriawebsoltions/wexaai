import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  const booking = await prisma.booking.findFirst({ where: { id, workspaceId } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.title && { title: body.title }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.duration && { duration: body.duration }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const booking = await prisma.booking.findFirst({ where: { id, workspaceId } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.booking.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
