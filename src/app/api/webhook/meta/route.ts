import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAiReply } from "@/lib/ai-reply";
import { normalizePhone } from "@/lib/apiHelpers";
import { runFlow } from "@/lib/flow-runner";

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
  console.log("[Webhook] Raw body:", JSON.stringify(body, null, 2));

  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return NextResponse.json({ status: "ok" });
  console.log("[Webhook] value:", JSON.stringify(value, null, 2));

  const phoneNumberId: string = value.metadata?.phone_number_id;
  if (!phoneNumberId) return NextResponse.json({ status: "ok" });
  console.log("[Webhook] phoneNumberId:", phoneNumberId);

  // ── Handle outbound delivery status updates (sent/delivered/read/failed) ──
  // These are NOT new messages — just update existing message status in DB
  const statuses = value.statuses as Array<{ id: string; status: string; errors?: unknown[] }> | undefined;
  if (statuses?.length) {
    for (const s of statuses) {
      console.log(`[Webhook] Status update — id: ${s.id}, status: ${s.status}`, s.errors ? `errors: ${JSON.stringify(s.errors)}` : "");
      await prisma.message.updateMany({
        where: { waMessageId: s.id },
        data: { status: s.status },
      }).catch(() => {});
    }
    return NextResponse.json({ status: "ok" });
  }

  // ── Handle inbound messages ──
  const messages = value.messages as Array<{ type: string; from: string; id: string; text?: { body: string } }> | undefined;
  console.log("[Webhook] messages:", JSON.stringify(messages, null, 2));
  if (!messages?.length) return NextResponse.json({ status: "ok" });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId, status: "active" },
    select: { workspaceId: true },
  });
  if (!account) return NextResponse.json({ status: "ok" });

  const { workspaceId } = account;

  type InboundMessage = {
    type: string;
    from: string;
    id: string;
    text?: { body: string };
    button?: { text: string; payload: string };
  };

  for (const m of messages as InboundMessage[]) {
    console.log("[Webhook] Processing message:", JSON.stringify(m, null, 2));
    // Only handle text and button (template button reply) messages
    if (m.type !== "text" && m.type !== "button") {
      console.log("[Webhook] Skipping unsupported message type:", m.type);
      continue;
    }

    // Deduplicate
    const existing = await prisma.message.findFirst({ where: { waMessageId: m.id } });
    if (existing) continue;

    const contactPhone = normalizePhone(m.from);

    // For button replies: use button.text as the message text, button.payload as payload
    const isButton = m.type === "button";
    const text = isButton ? (m.button?.text ?? "") : (m.text?.body ?? "");
    const buttonPayload = isButton ? (m.button?.payload ?? "") : "";

    const contactName =
      (value.contacts as Array<{ wa_id: string; profile?: { name?: string } }>)
        ?.find((c) => normalizePhone(c.wa_id) === contactPhone)
        ?.profile?.name ?? null;

    const contact = await prisma.contact.upsert({
      where: { workspaceId_phone: { workspaceId, phone: contactPhone } },
      update: contactName ? { name: contactName } : {},
      create: { workspaceId, phone: contactPhone, name: contactName ?? "Unknown" },
    });

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
        messageType: isButton ? "button" : "text",
      },
    });

    // Try to run an active flow directly (no HTTP fetch — avoids SSRF and Vercel cold-start issues)
    const { matched: flowMatched } = await runFlow({ workspaceId, phone: contactPhone, message: text, buttonPayload }).catch(() => ({ matched: false }));
    if (!flowMatched) {
      await handleAiReply(workspaceId, conversation.id, contactPhone, text).catch((err) => {
        console.error("[Webhook] AI reply failed:", err);
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
