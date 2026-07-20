import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET /api/messages?conversationId=xxx
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  const messages = await prisma.message.findMany({
    where: { conversationId, workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, text: true, direction: true, status: true, createdAt: true, from: true, messageType: true },
  });

  return NextResponse.json(messages);
}

// POST /api/messages — send outbound message via Meta Cloud API
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { conversationId, text } = await req.json();
  if (!conversationId || !text) return NextResponse.json({ error: "conversationId and text required" }, { status: 400 });

  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const account = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!account) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });

  // Send via Meta Cloud API
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${account.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
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
  if (!metaRes.ok) return NextResponse.json({ error: metaData.error?.message ?? "Meta API error" }, { status: 502 });

  const waMessageId = metaData.messages?.[0]?.id;

  const message = await prisma.message.create({
    data: {
      workspaceId,
      conversationId,
      contactId: conversation.contactId,
      from: account.phoneNumberId,
      text,
      waMessageId,
      direction: "outbound",
      status: "sent",
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: text, lastMessageAt: new Date() },
  });

  return NextResponse.json(message, { status: 201 });
}
