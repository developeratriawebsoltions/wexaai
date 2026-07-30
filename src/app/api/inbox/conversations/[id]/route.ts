import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET /api/inbox/conversations/[id] — fetch messages, reset unread
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [workspaceId, { id }] = await Promise.all([getWorkspaceId(user.id), params]);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = 50;

  const conversationPromise = prisma.conversation.findFirst({ where: { id, workspaceId } });
  const messagesPromise = prisma.message.findMany({
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

  const [conversation, messages] = await Promise.all([conversationPromise, messagesPromise]);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Reset unread in background (fire-and-forget) — don't block the response
  if (!cursor && conversation.unreadCount > 0) {
    prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } }).catch(() => {});
  }

  const reversed = messages.reverse();
  const nextCursor = messages.length === limit ? reversed[0].id : null;

  return NextResponse.json({
    conversation: cursor ? undefined : conversation,
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
