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

  const phoneNumberId: string = value.metadata?.phone_number_id;
  if (!phoneNumberId) return NextResponse.json({ status: "ok" });
  console.log("[Webhook] phoneNumberId:", phoneNumberId);

  // ── Handle outbound delivery status updates ──
  // FIX: Do NOT early return — same webhook call can contain both statuses + messages
  const statuses = value.statuses as Array<{ id: string; status: string; errors?: unknown[] }> | undefined;
  if (statuses?.length) {
    for (const s of statuses) {
      console.log(`[Webhook] Status update id=${s.id} status=${s.status}`, s.errors ? `errors:${JSON.stringify(s.errors)}` : "");
      await prisma.message.updateMany({
        where: { waMessageId: s.id },
        data: { status: s.status },
      }).catch(() => {});
    }
    // NO early return here — fall through to check messages too
  }

  // ── Handle inbound messages ──
  const messages = value.messages as Array<{
    type: string; from: string; id: string;
    text?: { body: string };
    button?: { text: string; payload: string };
    interactive?: {
      type: string;
      button_reply?: { id: string; title: string };
      list_reply?: { id: string; title: string; description?: string };
    };
    image?: { id: string; mime_type?: string };
    video?: { id: string; mime_type?: string };
    audio?: { id: string; mime_type?: string };
    document?: { id: string; filename?: string; mime_type?: string };
  }> | undefined;

  console.log("[Webhook] messages:", JSON.stringify(messages, null, 2));
  if (!messages?.length) return NextResponse.json({ status: "ok" });

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId, status: "active" },
    select: { workspaceId: true, accessToken: true },
  });
  if (!account) {
    console.log("[Webhook] No active WA account for phoneNumberId:", phoneNumberId);
    return NextResponse.json({ status: "ok" });
  }

  const { workspaceId } = account;

  async function getMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=url`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const metaData = await metaRes.json() as { url?: string };
      if (!metaData.url) return null;

      const mediaRes = await fetch(metaData.url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!mediaRes.ok) return null;

      const buffer = await mediaRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = mediaRes.headers.get("content-type") ?? "image/jpeg";
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      console.error("[Webhook] Failed to get media URL:", err);
      return null;
    }
  }

  type InboundMessage = typeof messages[number];

  for (const m of messages as InboundMessage[]) {
    console.log("[Webhook] Processing message type:", m.type, "from:", m.from, "id:", m.id);

    const isMedia = ["image", "video", "audio", "document"].includes(m.type);
    const isText = m.type === "text";
    const isButton = m.type === "button";           // template quick-reply
    const isInteractive = m.type === "interactive"; // interactive button/list reply

    if (!isMedia && !isText && !isButton && !isInteractive) {
      console.log("[Webhook] Skipping unsupported type:", m.type);
      continue;
    }

    // Deduplicate
    const existing = await prisma.message.findFirst({ where: { waMessageId: m.id } });
    if (existing) {
      console.log("[Webhook] Duplicate message, skipping:", m.id);
      continue;
    }

    const contactPhone = normalizePhone(m.from);

    let text = "";
    let mediaUrl: string | null = null;
    let messageType = "text";
    let effectiveButtonPayload = "";

    if (isButton) {
      text = m.button?.text ?? "";
      effectiveButtonPayload = m.button?.text || m.button?.payload || "";
      messageType = "button";
      console.log("[Webhook] BUTTON click — text:", text, "payload:", m.button?.payload);
    } else if (isInteractive) {
      const btnReply = m.interactive?.button_reply;
      const listReply = m.interactive?.list_reply;
      text = btnReply?.title ?? listReply?.title ?? "";
      effectiveButtonPayload = text;
      messageType = "button";
      console.log("[Webhook] INTERACTIVE button — title:", text, "id:", btnReply?.id ?? listReply?.id);
    } else if (isText) {
      text = m.text?.body ?? "";
      messageType = "text";
    } else if (isMedia) {
      messageType = m.type;
      const mediaIdField = m.type as "image" | "video" | "audio" | "document";
      const mediaId = m[mediaIdField]?.id;
      if (mediaId) {
        mediaUrl = await getMediaUrl(mediaId, account.accessToken);
        text = `[${m.type.toUpperCase()}]`;
      }
    }

    console.log("[Webhook] effectiveButtonPayload:", effectiveButtonPayload, "| text:", text);

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
        messageType,
        mediaUrl,
      },
    });

    const { matched: flowMatched } = await runFlow({
      workspaceId,
      phone: contactPhone,
      message: text,
      buttonPayload: effectiveButtonPayload,
    }).catch((err) => {
      console.error("[Webhook] runFlow error:", err);
      return { matched: false };
    });

    console.log("[Webhook] flowMatched:", flowMatched);

    if (!flowMatched) {
      await handleAiReply(workspaceId, conversation.id, contactPhone, text).catch((err) => {
        console.error("[Webhook] AI reply failed:", err);
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
