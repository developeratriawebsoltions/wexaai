import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

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

  // cursor = last message id from previous page (for older messages)
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor"); // message id
  const limit = 50;

  // Reset unread only on first page load
  if (!cursor) {
    await prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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

  const reversed = messages.reverse();
  // nextCursor = oldest message id in this page (for loading even older messages)
  const nextCursor = messages.length === limit ? reversed[0].id : null;

  return NextResponse.json({
    conversation: cursor ? undefined : conversation, // only send on first load
    messages: reversed,
    nextCursor,
    hasMore: messages.length === limit,
  });
}

// PATCH /api/inbox/conversations/[id] — update status (resolve/reopen/pending)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();
  const { status, assignedUserId } = body;

  const data: { status?: string; assignedTo?: string | null } = {};
  if (status !== undefined) data.status = status;
  if (assignedUserId !== undefined) data.assignedTo = assignedUserId;

  const updated = await prisma.conversation.updateMany({
    where: { id, workspaceId },
    data,
  });

  if (!updated.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
