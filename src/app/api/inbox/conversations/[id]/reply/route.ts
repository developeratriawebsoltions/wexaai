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

// POST /api/inbox/conversations/[id]/reply
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Message text required" }, { status: 400 });

  // Get conversation + WhatsApp account credentials
  const [conversation, waAccount] = await Promise.all([
    prisma.conversation.findFirst({ where: { id, workspaceId } }),
    prisma.whatsAppAccount.findUnique({ where: { workspaceId } }),
  ]);

  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (!waAccount || waAccount.status !== "active") {
    return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
  }

  // Send via Meta Cloud API
  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${waAccount.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${waAccount.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: conversation.contactPhone,
        type: "text",
        text: { body: text },
      }),
    }
  );

  const metaData = await metaRes.json();

  if (!metaRes.ok || metaData.error) {
    // Save as failed so agent knows
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId: id,
        contactId: conversation.contactId,
        from: waAccount.phoneNumberId,
        text,
        direction: "outbound",
        status: "failed",
        messageType: "text",
      },
    });
    return NextResponse.json(
      { error: metaData.error?.message ?? "Failed to send message" },
      { status: 400 }
    );
  }

  const waMessageId = metaData.messages?.[0]?.id;

  // Save outbound message + update conversation preview
  const [message] = await Promise.all([
    prisma.message.create({
      data: {
        workspaceId,
        conversationId: id,
        contactId: conversation.contactId,
        from: waAccount.phoneNumberId,
        text,
        waMessageId,
        direction: "outbound",
        status: "sent",
        messageType: "text",
      },
    }),
    prisma.conversation.update({
      where: { id },
      data: { lastMessage: text, lastMessageAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    id: message.id,
    text: message.text,
    direction: message.direction,
    status: message.status,
    createdAt: message.createdAt,
  });
}
