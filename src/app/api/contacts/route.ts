import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId, normalizePhone } from "@/lib/apiHelpers";
import { normalizeTags, serializeTags } from "@/lib/contactTags";

// GET /api/contacts?search=&tag=&page=1&limit=20
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const optedOut = searchParams.get("optedOut");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    workspaceId,
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ],
    } : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
    ...(optedOut !== null ? { optedOut: optedOut === "true" } : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { id: true, name: true, phone: true, email: true, tags: true, optedOut: true, customFields: true, createdAt: true },
    }),
    prisma.contact.count({ where }),
  ]);

  const normalizedContacts = contacts.map((contact) => ({
    ...contact,
    tags: normalizeTags(contact.tags),
  }));

  return NextResponse.json({ contacts: normalizedContacts, total, page, limit });
}

// POST /api/contacts
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { name, phone, email, tags } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });

  const normalizedPhone = normalizePhone(phone);

  const existing = await prisma.contact.findUnique({
    where: { workspaceId_phone: { workspaceId, phone: normalizedPhone } },
  });
  if (existing) return NextResponse.json({ error: "Contact with this phone already exists" }, { status: 409 });

  const contact = await prisma.contact.create({
    data: { workspaceId, name: name || "Unknown", phone: normalizedPhone, email, tags: serializeTags(tags ?? []) },
  });

  // Auto welcome template — fire & forget
  (async () => {
    try {
      const wsSettings = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
      if (!wsSettings?.welcomeTemplateEnabled || !wsSettings?.welcomeTemplateName) return;

      const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
      if (!wa) return;

      const template = await prisma.template.findFirst({
        where: { workspaceId, name: wsSettings.welcomeTemplateName },
        select: { language: true, body: true, headerType: true, header: true, buttons: true },
      });
      if (!template) return;

      const toPhone = normalizedPhone.replace(/^\+/, "");
      const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

      if (template.headerType === "IMAGE" && template.header) {
        components.push({ type: "header", parameters: [{ type: "image", image: { link: template.header } }] });
      }

      // Replace {{1}}, {{2}} etc with contact name
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
        where: { workspaceId_contactPhone: { workspaceId, contactPhone: normalizedPhone } },
        update: { lastMessage: resolvedBody, lastMessageAt: new Date() },
        create: { workspaceId, contactId: contact.id, contactPhone: normalizedPhone, contactName: name || "Unknown", lastMessage: resolvedBody },
      });

      await prisma.message.create({
        data: {
          workspaceId,
          conversationId: conversation.id,
          contactId: contact.id,
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
    } catch (err) {
      console.error("[Welcome Template] failed:", err);
    }
  })();

  return NextResponse.json(contact, { status: 201 });
}
