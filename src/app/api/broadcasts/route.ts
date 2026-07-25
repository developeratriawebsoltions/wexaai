import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET /api/broadcasts
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const broadcasts = await prisma.broadcast.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(broadcasts);
}

// POST /api/broadcasts
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { campaignName, templateName, audience, contactIds, headerUrl, bodyVariables } = await req.json();
  if (!campaignName || !templateName) {
    return NextResponse.json({ error: "campaignName and templateName are required" }, { status: 400 });
  }

  // Get WhatsApp account
  const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!wa) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });

  // Get contacts
  const contactFilter = contactIds && Array.isArray(contactIds) && contactIds.length > 0
    ? { id: { in: contactIds }, workspaceId }
    : { workspaceId };

  const contacts = await prisma.contact.findMany({
    where: contactFilter,
    select: { id: true, phone: true, name: true },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No contacts found" }, { status: 400 });
  }

  // Create broadcast record
  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      campaignName,
      templateName,
      audience: audience ?? "all",
      status: "sending",
      totalCount: contacts.length,
    },
  });

  // Fetch template from DB to get correct language and header info
  const templateRecord = await prisma.template.findFirst({
    where: { workspaceId, name: templateName },
    select: { language: true, headerType: true, header: true },
  });
  const templateLanguage = templateRecord?.language ?? "en";

  // Fetch template body to resolve per-contact dynamic variables
  const templateBody = await prisma.template.findFirst({
    where: { workspaceId, name: templateName },
    select: { body: true },
  });

  const bodyVarCount = templateBody
    ? Math.max(0, ...([...templateBody.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1]))))
    : 0;

  // Respond immediately — process in background to avoid Vercel timeout
  const responsePayload = NextResponse.json(
    { ...broadcast, status: "sending", message: "Broadcast started" },
    { status: 201 }
  );

  // Background processing — chunked to avoid rate limits
  (async () => {
    let sentCount = 0;
    let failedCount = 0;
    const CHUNK_SIZE = 10;

    for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
      const chunk = contacts.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (contact) => {
          try {
            const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

            if (templateRecord?.headerType === "IMAGE") {
              const mediaLink = headerUrl || templateRecord.header;
              if (!mediaLink) throw new Error("No header URL for image template");
              components.push({ type: "header", parameters: [{ type: "image", image: { link: mediaLink } }] });
            }

            if (bodyVarCount > 0 && bodyVariables && typeof bodyVariables === "object") {
              const bodyParams = Array.from({ length: bodyVarCount }, (_, idx) => {
                const key = String(idx + 1);
                let value = (bodyVariables as Record<string, string>)[key]?.trim() || "";
                if (value.toLowerCase() === "{{name}}" || value.toLowerCase() === "name") {
                  value = (contact as { name?: string }).name || contact.phone;
                }
                return { type: "text", text: value || contact.phone };
              });
              components.push({ type: "body", parameters: bodyParams });
            }

            const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: contact.phone.replace(/^\+/, ""),
                type: "template",
                template: {
                  name: templateName,
                  language: { code: templateLanguage },
                  ...(components.length ? { components } : {}),
                },
              }),
            });

            const data = await res.json();
            const messageId = data?.messages?.[0]?.id ?? null;
            const status = res.ok && messageId ? "sent" : "failed";
            if (status === "sent") sentCount++; else failedCount++;

            await prisma.broadcastLog.create({
              data: { broadcastId: broadcast.id, contactId: contact.id, phone: contact.phone, status, messageId },
            });
          } catch {
            failedCount++;
            await prisma.broadcastLog.create({
              data: { broadcastId: broadcast.id, contactId: contact.id, phone: contact.phone, status: "failed" },
            });
          }
        })
      );

      // 300ms delay between chunks to respect Meta rate limits
      if (i + CHUNK_SIZE < contacts.length) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "completed", sentCount, failedCount },
    });
  })().catch(async (err) => {
    console.error("[Broadcast] background error:", err);
    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "failed" },
    });
  });

  return responsePayload;
}
