import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/apiHelpers";

// POST /api/integrations/zapier
// Called by Zapier/Make when a new row is added to Google Sheet
// Body: { apiKey, phone, name, templateName, variables: { "1": "value" } }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, phone, name, templateName, variables } = body;

  if (!apiKey || !phone || !templateName)
    return NextResponse.json({ error: "apiKey, phone and templateName are required" }, { status: 400 });

  // Validate API key
  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    select: { workspaceId: true },
  });
  if (!key) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

  const { workspaceId } = key;

  const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!wa) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });

  const template = await prisma.template.findFirst({
    where: { workspaceId, name: templateName },
    select: { language: true, body: true, headerType: true, header: true },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const normalizedPhone = normalizePhone(String(phone));
  const toPhone = normalizedPhone.replace(/^\+/, "");

  // Upsert contact
  const contact = await prisma.contact.upsert({
    where: { workspaceId_phone: { workspaceId, phone: normalizedPhone } },
    update: name ? { name } : {},
    create: { workspaceId, phone: normalizedPhone, name: name || "Unknown" },
  });

  // Build template components
  const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

  if (template.headerType === "IMAGE" && template.header) {
    components.push({ type: "header", parameters: [{ type: "image", image: { link: template.header } }] });
  }

  const bodyVarCount = Math.max(
    0,
    ...([...template.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1])))
  );

  if (bodyVarCount > 0 && variables) {
    const bodyParams = Array.from({ length: bodyVarCount }, (_, idx) => {
      const key = String(idx + 1);
      let value = (variables as Record<string, string>)[key]?.trim() || "";
      if (!value || value.toLowerCase() === "name") value = name || toPhone;
      return { type: "text", text: value };
    });
    components.push({ type: "body", parameters: bodyParams });
  }

  // Send WhatsApp message
  const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: template.language },
        ...(components.length ? { components } : {}),
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "WhatsApp send failed" }, { status: 502 });

  const waMessageId = data?.messages?.[0]?.id;

  // Log the message
  const conversation = await prisma.conversation.upsert({
    where: { workspaceId_contactPhone: { workspaceId, contactPhone: normalizedPhone } },
    update: { lastMessage: `[Template: ${templateName}]`, lastMessageAt: new Date() },
    create: { workspaceId, contactId: contact.id, contactPhone: normalizedPhone, contactName: name || "Unknown", lastMessage: `[Template: ${templateName}]` },
  });

  await prisma.message.create({
    data: {
      workspaceId,
      conversationId: conversation.id,
      contactId: contact.id,
      from: wa.phoneNumberId,
      text: `[Template: ${templateName}]`,
      waMessageId,
      direction: "outbound",
      status: "sent",
      messageType: "template",
    },
  });

  return NextResponse.json({ success: true, messageId: waMessageId, contact: { id: contact.id, phone: normalizedPhone } });
}
