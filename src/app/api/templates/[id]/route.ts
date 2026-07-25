import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

// POST /api/templates/[id] — send template to a contact
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const { contactId, variables, headerUrl } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const [template, contact, wa] = await Promise.all([
    prisma.template.findFirst({ where: { id, workspaceId: membership.workspaceId } }),
    prisma.contact.findFirst({ where: { id: contactId, workspaceId: membership.workspaceId } }),
    prisma.whatsAppAccount.findUnique({ where: { workspaceId: membership.workspaceId } }),
  ]);

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (!wa || wa.status !== "active") return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
  if (template.status !== "APPROVED") return NextResponse.json({ error: "Template is not approved" }, { status: 400 });

  console.log("[Template Send] template.headerType:", template.headerType);
  console.log("[Template Send] template.header:", template.header);

  // Build components with variable substitution
  type MetaParam = { type: string; text?: string; image?: { link: string }; video?: { link: string }; document?: { link: string } };
  const components: { type: string; parameters?: MetaParam[] }[] = [];

  if (template.headerType) {
    const isMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(template.headerType);
    if (isMedia) {
      const mediaLink = headerUrl || template.header;
      if (!mediaLink) return NextResponse.json({ error: `Please provide an image URL to send this template.` }, { status: 400 });
      const mediaKey = template.headerType.toLowerCase() as "image" | "video" | "document";
      components.push({
        type: "header",
        parameters: [{ type: mediaKey, [mediaKey]: { link: mediaLink } } as MetaParam],
      });
    }
  }

  const filledVars = (variables?.body ?? []).filter((v: string) => v.trim() !== "");
  if (filledVars.length) {
    components.push({
      type: "body",
      parameters: filledVars.map((v: string) => ({ type: "text", text: v })),
    });
  }

  const metaPayload = {
    messaging_product: "whatsapp",
    to: contact.phone.replace(/^\+/, ""),
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      ...(components.length ? { components } : {}),
    },
  };

  console.log("[Template Send] payload:", JSON.stringify(metaPayload, null, 2));

  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
      body: JSON.stringify(metaPayload),
    }
  );

  const metaData = await metaRes.json();
  console.log("[Template Send] meta response:", JSON.stringify(metaData, null, 2));
  if (!metaRes.ok) return NextResponse.json({ error: metaData.error?.message ?? "Meta API error" }, { status: 502 });

  // Upsert conversation & save message
  let conversation = await prisma.conversation.findFirst({
    where: { workspaceId: membership.workspaceId, contactId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: membership.workspaceId,
        contactId,
        contactPhone: contact.phone,
        contactName: contact.name,
        lastMessage: template.body,
        lastMessageAt: new Date(),
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: template.body, lastMessageAt: new Date() },
    });
  }

  await prisma.message.create({
    data: {
      workspaceId: membership.workspaceId,
      conversationId: conversation.id,
      contactId,
      from: wa.phoneNumberId,
      text: template.body,
      waMessageId: metaData.messages?.[0]?.id,
      direction: "outbound",
      status: "sent",
      messageType: "template",
      mediaUrl: template.headerType && template.headerType !== "TEXT" ? (headerUrl || template.header) : null,
      metadata: template.buttons ? template.buttons : undefined,
    },
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/templates/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;

  const template = await prisma.template.findFirst({
    where: { id, workspaceId: membership.workspaceId },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from Meta if we have the meta template id
  if (template.metaTemplateId) {
    const wa = await prisma.whatsAppAccount.findUnique({
      where: { workspaceId: membership.workspaceId },
    });

    if (wa?.status === "active") {
      await fetch(
        `https://graph.facebook.com/v21.0/${wa.wabaId}/message_templates?hsm_id=${template.metaTemplateId}&name=${template.name}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${wa.accessToken}` },
        }
      );
      // We don't block on Meta delete failure — remove from DB regardless
    }
  }

  await prisma.template.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// PUT /api/templates/[id] — update template on Meta + DB
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();

  const [template, wa] = await Promise.all([
    prisma.template.findFirst({ where: { id, workspaceId: membership.workspaceId } }),
    prisma.whatsAppAccount.findUnique({ where: { workspaceId: membership.workspaceId } }),
  ]);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (!wa || wa.status !== "active") return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });

  const { header, headerType, body: bodyText, footer, buttons } = body;

  // Build Meta components
  type MetaComponent = { type: string; format?: string; text?: string; example?: { header_url?: string[]; body_text?: string[][] }; buttons?: unknown[] };
  const components: MetaComponent[] = [];

  if (headerType) {
    const isMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
    if (isMedia && header) {
      components.push({ type: "HEADER", format: headerType, example: { header_url: [header] } });
    } else if (!isMedia && header) {
      components.push({ type: "HEADER", format: "TEXT", text: header });
    }
  }

  const newBody = bodyText ?? template.body;
  const bodyVarMatches = [...newBody.matchAll(/\{\{(\d+)\}\}/g)];
  const bodyVarCount = bodyVarMatches.length ? Math.max(...bodyVarMatches.map((m: RegExpMatchArray) => parseInt(m[1]))) : 0;
  components.push({
    type: "BODY",
    text: newBody,
    ...(bodyVarCount > 0 ? { example: { body_text: [Array(bodyVarCount).fill("sample")] } } : {}),
  });

  if (footer) components.push({ type: "FOOTER", text: footer });

  type ButtonInput = { type: string; text: string; url?: string; phone_number?: string };
  if (buttons?.length) {
    components.push({
      type: "BUTTONS",
      buttons: buttons.map((b: ButtonInput) => {
        if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
        return { type: "QUICK_REPLY", text: b.text };
      }),
    });
  }

  // Send PATCH to Meta
  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${template.metaTemplateId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
    body: JSON.stringify({ components }),
  });
  const metaData = await metaRes.json();
  if (!metaRes.ok || metaData.error) {
    console.error("[Template Update] Meta error:", JSON.stringify(metaData, null, 2));
    return NextResponse.json({ error: metaData.error?.error_user_msg ?? metaData.error?.message ?? "Meta API error" }, { status: 400 });
  }

  // Update DB
  try {
    const updated = await prisma.template.update({
      where: { id },
      data: {
        header: header ?? null,
        headerType: headerType ?? null,
        body: newBody,
        footer: footer ?? null,
        buttons: buttons !== undefined ? buttons : template.buttons,
        status: "PENDING",
        rejectedReason: null,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[Template Update] DB error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Failed to update" }, { status: 400 });
  }
}
