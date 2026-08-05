import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAiEngine } from "@/lib/ai-engine";
import { normalizePhone } from "@/lib/apiHelpers";
import { runFlow } from "@/lib/flow-runner";
import { handleLeadQualification } from "@/lib/lead-qualifier";
import { handleBookingScheduler } from "@/lib/booking-scheduler";

import { pushStatusToSheet } from "@/app/api/integrations/google-sheets/two-way-sync/route";
import { parseTemplateUpdateFromChange, getTemplateEventPayload } from "./webhook-utils";

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

  // Respond to Meta immediately — must reply within 5s or Meta retries (causes duplicates)
  const response = NextResponse.json({ status: "ok" });
  processWebhook(body).catch((err) => console.error("[Webhook] processing error:", err));
  return response;
}

async function processWebhook(body: unknown) {
  const value = (body as Record<string, unknown> | null)
    ?.["entry"] instanceof Array
    ? ((body as { entry: { changes: { value: unknown }[] }[] }).entry?.[0]?.changes?.[0]?.value)
    : null;
  if (!value) return;

  const webhookValue = value as Record<string, any>;
  const phoneNumberId: string = (webhookValue?.metadata as Record<string, string>)?.phone_number_id;
  if (!phoneNumberId) return;
  console.log("[Webhook] phoneNumberId:", phoneNumberId);

  const templateChanges = Array.isArray(webhookValue.changes) ? webhookValue.changes : [];
  for (const change of templateChanges) {
    const parsed = parseTemplateUpdateFromChange(change);
    if (!parsed) continue;

    const templateName = parsed.templateName || "unknown_template";
    const existingTemplate = await prisma.template.findFirst({
      where: { workspaceId: (await prisma.workspace.findFirst({ where: { whatsappAccount: { phoneNumberId } } }))?.id ?? "", name: templateName },
    }).catch(() => null);

    if (!existingTemplate) continue;

    const updatePayload: Record<string, any> = {
      status: parsed.status,
      rejectedReason: parsed.status === "REJECTED" ? parsed.rejectionReason ?? "Template rejected by Meta" : null,
    };

    if (parsed.components?.length) {
      const components = parsed.components;
      const headerComponent = components.find((c: any) => c.type === "HEADER");
      const bodyComponent = components.find((c: any) => c.type === "BODY");
      const footerComponent = components.find((c: any) => c.type === "FOOTER");
      const buttonsComponent = components.find((c: any) => c.type === "BUTTONS");

      if (headerComponent) {
        updatePayload.headerType = headerComponent.format ?? existingTemplate.headerType;
        updatePayload.header = headerComponent.example?.header_handle?.[0] ?? headerComponent.text ?? existingTemplate.header;
      }
      if (bodyComponent) updatePayload.body = bodyComponent.text ?? existingTemplate.body;
      if (footerComponent) updatePayload.footer = footerComponent.text ?? existingTemplate.footer;
      if (buttonsComponent) updatePayload.buttons = buttonsComponent.buttons ?? existingTemplate.buttons;
    }

    await prisma.template.updateMany({
      where: { workspaceId: existingTemplate.workspaceId, name: templateName },
      data: updatePayload,
    }).catch(() => {});
  }

  // ── Handle outbound delivery status updates ──
  // FIX: Do NOT early return — same webhook call can contain both statuses + messages
  const statuses = webhookValue.statuses as Array<{ id: string; status: string; errors?: unknown[] }> | undefined;
  if (statuses?.length) {
    for (const s of statuses) {
      console.log(`[Webhook] Status update id=${s.id} status=${s.status}`, s.errors ? `errors:${JSON.stringify(s.errors)}` : "");
      await prisma.message.updateMany({
        where: { waMessageId: s.id },
        data: { status: s.status },
      }).catch(() => {});

      const broadcastStatus = s.status === "read" ? "read" : s.status === "delivered" ? "delivered" : s.status;
      await prisma.broadcastLog.updateMany({
        where: { messageId: s.id },
        data: { status: broadcastStatus },
      }).catch(() => {});
    }
    // NO early return here — fall through to check messages too
  }

  // ── Handle inbound messages ──
  const messages = webhookValue.messages as Array<{
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
  if (!messages?.length) return;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId, status: "active" },
    select: { workspaceId: true, accessToken: true },
  });
  if (!account) {
    console.log("[Webhook] No active WA account for phoneNumberId:", phoneNumberId);
    return;
  }

  const { workspaceId } = account;

  async function getMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
    try {
      const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?fields=url`, {
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
      (webhookValue.contacts as Array<{ wa_id: string; profile?: { name?: string } }>)
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

    // Mark broadcast log as replied if this contact received a broadcast
    await prisma.broadcastLog.updateMany({
      where: { phone: contactPhone, status: { in: ["sent", "delivered", "read"] } },
      data: { status: "replied" },
    }).catch(() => {});

    // Two-way sync — push conversation update to Google Sheet
    pushStatusToSheet(workspaceId, {
      phone: contactPhone,
      name: contactName || "Unknown",
      status: "replied",
      lastMessage: text,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});

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
      conversationId: conversation.id,
      contactId: contact.id,
    }).catch((err) => {
      console.error("[Webhook] runFlow error:", err);
      return { matched: false };
    });

    console.log("[Webhook] flowMatched:", flowMatched);

    // Only handle text/button messages with automation
    if (!flowMatched) {
      if (isText) {
        // 1. Booking scheduler
        let bookHandled = false;
        let bookReply: string | undefined;
        try {
          const result = await handleBookingScheduler(workspaceId, contactPhone, conversation.id, text);
          bookHandled = result.handled;
          bookReply = result.reply;
        } catch (err) {
          console.error("[Webhook] booking scheduler error:", err);
        }

        if (bookHandled && bookReply) {
          await sendOutboundMessage(workspaceId, conversation.id, contact.id, contactPhone, bookReply);
        } else {
          // 2. Lead qualification
          let qualHandled = false;
          let qualReply: string | undefined;
          try {
            const result = await handleLeadQualification(workspaceId, contactPhone, conversation.id, text);
            qualHandled = result.handled;
            qualReply = result.reply;
          } catch (err) {
            console.error("[Webhook] lead qualification error:", err);
          }

          if (qualHandled && qualReply) {
            await sendOutboundMessage(workspaceId, conversation.id, contact.id, contactPhone, qualReply);
          } else {
            // 3. AI engine fallback
            await runAiEngine(workspaceId, conversation.id, contactPhone, text).catch((err) => {
              console.error("[Webhook] AI engine failed:", err);
            });
          }
        }
      } else {
        // Non-text (button/media) with no flow match — try AI
        await runAiEngine(workspaceId, conversation.id, contactPhone, text).catch((err) => {
          console.error("[Webhook] AI engine failed:", err);
        });
      }
    }
  }
}

async function sendOutboundMessage(
  workspaceId: string,
  conversationId: string,
  contactId: string,
  contactPhone: string,
  text: string
) {
  try {
    const waAccount = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
    if (!waAccount) return;
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${waAccount.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${waAccount.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: contactPhone.replace(/^\+/, ""), type: "text", text: { body: text } }),
      }
    );
    const metaData = await metaRes.json().catch(() => ({}));
    await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        contactId,
        from: "AI",
        text,
        waMessageId: (metaData as any)?.messages?.[0]?.id,
        direction: "outbound",
        status: metaRes.ok ? "sent" : "failed",
        messageType: "text",
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: text, lastMessageAt: new Date() },
    });
  } catch (err) {
    console.error("[Webhook] sendOutboundMessage error:", err);
  }
}