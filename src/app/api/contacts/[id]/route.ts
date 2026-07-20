import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

type Params = { params: Promise<{ id: string }> };

// GET /api/contacts/:id
export async function GET(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, workspaceId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(contact);
}

// PATCH /api/contacts/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();
  const { name, email, tags } = body;

  const contact = await prisma.contact.updateMany({
    where: { id, workspaceId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
  });

  if (!contact.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

// DELETE /api/contacts/:id
export async function DELETE(req: NextRequest, { params }: Params) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;

  const contact = await prisma.contact.findFirst({ where: { id, workspaceId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete related records first to avoid FK constraint errors
  const conversations = await prisma.conversation.findMany({
    where: { contactId: id, workspaceId },
    select: { id: true },
  });
  const conversationIds = conversations.map((c) => c.id);

  await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
  await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  await prisma.contact.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
