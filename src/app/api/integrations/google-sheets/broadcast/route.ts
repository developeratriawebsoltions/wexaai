import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";
import { fetchGoogleSheetContacts } from "@/lib/google-sheets";
import { serializeTags } from "@/lib/contactTags";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { sheetUrl, campaignName, templateName, bodyVariables, headerUrl, scheduledAt } = await req.json();

  if (!sheetUrl || !campaignName || !templateName)
    return NextResponse.json({ error: "sheetUrl, campaignName and templateName are required" }, { status: 400 });

  // Fetch contacts directly from sheet — no import needed
  let sheetContacts;
  try {
    sheetContacts = await fetchGoogleSheetContacts(sheetUrl);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (sheetContacts.length === 0)
    return NextResponse.json({ error: "No valid contacts in sheet. Make sure there is a 'phone' column." }, { status: 400 });

  const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!wa) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });

  const templateRecord = await prisma.template.findFirst({
    where: { workspaceId, name: templateName },
    select: { language: true, headerType: true, header: true, body: true },
  });
  if (!templateRecord) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const futureSchedule = scheduledAt ? new Date(scheduledAt) : null;

  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      campaignName,
      templateName,
      audience: "google_sheet",
      status: scheduledAt ? "scheduled" : "sending",
      totalCount: sheetContacts.length,
      scheduledAt: futureSchedule,
    },
  });

  // For scheduled — store as queued logs with phone only
  if (scheduledAt) {
    await prisma.broadcastLog.createMany({
      data: sheetContacts.map((c) => ({
        broadcastId: broadcast.id,
        contactId: "sheet_contact", // placeholder — no DB contact needed
        phone: "+" + String(c.phone).replace(/\D/g, ""),
        status: "queued",
      })),
    });
    return NextResponse.json({ broadcast, status: "scheduled" }, { status: 201 });
  }

  // Respond immediately — process in background
  const responsePayload = NextResponse.json({ ...broadcast, message: "Broadcast started from Sheet" }, { status: 201 });

  (async () => {
    let sentCount = 0, failedCount = 0;
    const bodyVarCount = Math.max(
      0,
      ...([...templateRecord.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1])))
    );

    for (const contact of sheetContacts) {
      try {
        const phone = String(contact.phone).replace(/\D/g, "");
        const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

        if (templateRecord.headerType === "IMAGE") {
          const mediaLink = headerUrl || templateRecord.header;
          if (mediaLink) components.push({ type: "header", parameters: [{ type: "image", image: { link: mediaLink } }] });
        }

        if (bodyVarCount > 0 && bodyVariables) {
          const bodyParams = Array.from({ length: bodyVarCount }, (_, idx) => {
            const key = String(idx + 1);
            let value = (bodyVariables as Record<string, string>)[key]?.trim() || "";
            if (value.toLowerCase() === "name" || value.toLowerCase() === "{{name}}") {
              value = contact.name || phone;
            }
            return { type: "text", text: value || phone };
          });
          components.push({ type: "body", parameters: bodyParams });
        }

        const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: templateName,
              language: { code: templateRecord.language },
              ...(components.length ? { components } : {}),
            },
          }),
        });

        const data = await res.json();
        const messageId = data?.messages?.[0]?.id ?? null;
        const status = res.ok && messageId ? "sent" : "failed";
        if (status === "sent") sentCount++; else failedCount++;

        // Upsert contact so we have a real contactId for the log
        const { normalizePhone } = await import("@/lib/apiHelpers");
        const normalizedPhone = normalizePhone(String(contact.phone));
        const dbContact = await prisma.contact.upsert({
          where: { workspaceId_phone: { workspaceId, phone: normalizedPhone } },
          update: {},
          create: {
            workspaceId,
            phone: normalizedPhone,
            name: contact.name || "Unknown",
            email: contact.email || null,
            tags: serializeTags(contact.tags),
          },
        });

        await prisma.broadcastLog.create({
          data: { broadcastId: broadcast.id, contactId: dbContact.id, phone: normalizedPhone, status, messageId },
        });
      } catch {
        failedCount++;
      }
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "completed", sentCount, failedCount },
    });
  })().catch(async (err) => {
    console.error("[Sheet Broadcast] error:", err);
    await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: "failed" } });
  });

  return responsePayload;
}
