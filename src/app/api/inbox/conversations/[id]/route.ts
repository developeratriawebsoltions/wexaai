import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

async function getWorkspaceId(userId: string) {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return m?.workspaceId ?? null;
}

// GET /api/inbox/conversations/[id] — fetch messages, reset unread
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reset unread count when agent opens conversation
  await prisma.conversation.update({
    where: { id },
    data: { unreadCount: 0 },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      text: true,
      direction: true,
      status: true,
      createdAt: true,
      from: true,
      messageType: true,
      mediaUrl: true,
      metadata: true,
    },
  });

  return NextResponse.json({ conversation, messages });
}

// PATCH /api/inbox/conversations/[id] — update status (resolve/reopen/pending)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const { status } = await req.json();

  const updated = await prisma.conversation.updateMany({
    where: { id, workspaceId },
    data: { status },
  });

  if (!updated.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
