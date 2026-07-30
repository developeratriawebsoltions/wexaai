import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId, normalizePhone } from "@/lib/apiHelpers";
import { fetchGoogleSheetContacts } from "@/lib/google-sheets";
import { serializeTags } from "@/lib/contactTags";

async function sendWelcomeTemplate(
  workspaceId: string,
  contactId: string,
  phone: string,
  name: string
) {
  const wsSettings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  if (!wsSettings?.welcomeTemplateEnabled || !wsSettings?.welcomeTemplateName) return;

  const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!wa) return;

  const template = await prisma.template.findFirst({
    where: { workspaceId, name: wsSettings.welcomeTemplateName },
    select: { language: true, body: true, headerType: true, header: true, buttons: true },
  });
  if (!template) return;

  const toPhone = phone.replace(/^\+/, "");
  const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

  if (template.headerType === "IMAGE" && template.header) {
    components.push({ type: "header", parameters: [{ type: "image", image: { link: template.header } }] });
  }

  const bodyVarCount = Math.max(0, ...([...template.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1]))));
  const resolvedBody = template.body.replace(/\{\{\d+\}\}/g, name || toPhone);

  if (bodyVarCount > 0) {
    components.push({
      type: "body",
      parameters: Array.from({ length: bodyVarCount }, () => ({ type: "text", text: name || toPhone })),
    });
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: wsSettings.welcomeTemplateName,
        language: { code: template.language },
        ...(components.length ? { components } : {}),
      },
    }),
  });

  const data = await res.json();
  const waMessageId = data?.messages?.[0]?.id ?? null;

  const conversation = await prisma.conversation.upsert({
    where: { workspaceId_contactPhone: { workspaceId, contactPhone: phone } },
    update: { lastMessage: resolvedBody, lastMessageAt: new Date() },
    create: { workspaceId, contactId, contactPhone: phone, contactName: name || "Unknown", lastMessage: resolvedBody },
  });

  await prisma.message.create({
    data: {
      workspaceId,
      conversationId: conversation.id,
      contactId,
      from: wa.phoneNumberId,
      text: resolvedBody,
      waMessageId,
      direction: "outbound",
      status: "sent",
      messageType: "template",
      mediaUrl: template.headerType === "IMAGE" ? (template.header ?? null) : null,
      metadata: template.buttons ?? undefined,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const integration = await prisma.googleSheetIntegration.findUnique({ where: { workspaceId } });
  if (!integration) return NextResponse.json({ error: "Google Sheets not connected" }, { status: 404 });

  let contacts;
  try {
    contacts = await fetchGoogleSheetContacts(integration.sheetUrl);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (contacts.length === 0)
    return NextResponse.json({ error: "No valid contacts found. Sheet must have a 'phone' column." }, { status: 400 });

  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    try {
      const phone = normalizePhone(String(c.phone));

      // Check if contact already exists (to avoid sending welcome to existing contacts)
      const existing = await prisma.contact.findUnique({
        where: { workspaceId_phone: { workspaceId, phone } },
      });

      const contact = await prisma.contact.upsert({
        where: { workspaceId_phone: { workspaceId, phone } },
        update: {
          ...(c.name ? { name: String(c.name) } : {}),
          ...(c.email ? { email: String(c.email) } : {}),
          ...(c.tags.length > 0 ? { tags: serializeTags(c.tags) } : {}),
        },
        create: { workspaceId, phone, name: c.name || "Unknown", email: c.email || null, tags: serializeTags(c.tags) },
      });

      // Send welcome template only for NEW contacts
      if (!existing) {
        sendWelcomeTemplate(workspaceId, contact.id, phone, c.name || "").catch((err) =>
          console.error("[Sync Welcome Template] failed:", err)
        );
      }

      imported++;
    } catch (err) {
      errors.push(`${c.phone}: ${(err as Error).message}`);
      skipped++;
    }
  }

  await prisma.googleSheetIntegration.update({
    where: { workspaceId },
    data: { lastSyncedAt: new Date(), lastSyncCount: imported },
  });

  return NextResponse.json({ imported, skipped, errors, total: contacts.length });
}
