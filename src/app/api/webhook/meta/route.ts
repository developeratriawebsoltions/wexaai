import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAiReply } from "@/lib/ai-reply";
import { normalizePhone } from "@/lib/apiHelpers";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN ?? "wexa_verify_2026";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return NextResponse.json({ status: "ok" });

  const phoneNumberId: string = value.metadata?.phone_number_id;
  const messages = value.messages as Array<{ type: string; from: string; id: string; text?: { body: string } }>;

  if (!phoneNumberId || !messages?.length) return NextResponse.json({ status: "ok" });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId, status: "active" },
    select: { workspaceId: true },
  });

  if (!account) return NextResponse.json({ status: "ok" });

  const { workspaceId } = account;

  for (const m of messages) {
    if (m.type !== "text") continue;

    const contactPhone: string = normalizePhone(m.from);
    const text: string = m.text?.body ?? "";
    const contactName: string | null =
      (value.contacts as Array<{ wa_id: string; profile?: { name?: string } }>)?.find((c) => normalizePhone(c.wa_id) === contactPhone)?.profile?.name ?? null;

    // Step 1: Find or create Contact
    const contact = await prisma.contact.upsert({
      where: { workspaceId_phone: { workspaceId, phone: contactPhone } },
      update: contactName ? { name: contactName } : {},
      create: {
        workspaceId,
        phone: contactPhone,
        name: contactName ?? "Unknown",
      },
    });

    // Step 2: Find or create Conversation
    const conversation = await prisma.conversation.upsert({
      where: { workspaceId_contactPhone: { workspaceId, contactPhone } },
      update: {
        lastMessage: text,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        ...(contactName ? { contactName } : {}),
      },
      create: {
        workspaceId,
        contactId: contact.id,
        contactPhone,
        contactName,
        lastMessage: text,
        lastMessageAt: new Date(),
        unreadCount: 1,
      },
    });

    // Step 3: Save Message
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        contactId: contact.id,
        from: contactPhone,
        text,
        waMessageId: m.id,
        direction: "inbound",
        status: "received",
        messageType: "text",
      },
    });

    // Step 4: AI Auto Reply — await it so serverless doesn't kill it early
    await handleAiReply(workspaceId, conversation.id, contactPhone, text).catch((err) => {
      console.error("[Webhook] AI reply failed:", err);
    });
  }

  return NextResponse.json({ status: "ok" });
}
