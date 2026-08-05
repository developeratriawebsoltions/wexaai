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
    include: { logs: { select: { status: true } } },
  });

  const payload = broadcasts.map((broadcast) => {
    const readCount = broadcast.logs.filter((log) => log.status === "read").length;
    const repliedCount = broadcast.logs.filter((log) => log.status === "replied").length;
    return {
      ...broadcast,
      readCount,
      repliedCount,
      logs: undefined,
    };
  });

  return NextResponse.json(payload);
}

// POST /api/broadcasts
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { campaignName, templateName, audience, contactIds, headerUrl, bodyVariables, scheduledAt } = await req.json();
  if (!campaignName || !templateName) {
    return NextResponse.json({ error: "campaignName and templateName are required" }, { status: 400 });
  }

  const futureSchedule = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduledAt && (!futureSchedule || isNaN(futureSchedule.getTime()))) {
    return NextResponse.json({ error: "Invalid scheduledAt date" }, { status: 400 });
  }

  // Get WhatsApp account
  const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!wa) return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });

  // Get contacts
  const contactFilter = contactIds && Array.isArray(contactIds) && contactIds.length > 0
    ? { id: { in: contactIds }, workspaceId }
    : { workspaceId };

  const contacts = await prisma.contact.findMany({
    where: { ...contactFilter, optedOut: false },
    select: { id: true, phone: true, name: true },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No contacts found" }, { status: 400 });
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      workspaceId,
      campaignName,
      templateName,
      audience: audience ?? "all",
      status: scheduledAt ? "scheduled" : "sending",
      totalCount: contacts.length,
      scheduledAt: scheduledAt ? futureSchedule : undefined,
    },
  });

  if (scheduledAt) {
    // Store contact IDs as metadata so the cron job knows who to send to
    await prisma.broadcastLog.createMany({
      data: contacts.map((c) => ({
        broadcastId: broadcast.id,
        contactId: c.id,
        phone: c.phone,
        status: "queued",
      })),
    });
    return NextResponse.json({ broadcast, status: "scheduled", message: "Broadcast scheduled" }, { status: 201 });
  }

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

  // Background processing — fully sequential, 1 message per second (WATI-style)
  (async () => {
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      try {
        const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

        if (templateRecord?.headerType === "IMAGE") {
          const isCloudinary = (u?: string | null) => !!u && u.includes("cloudinary.com");
          const mediaLink = isCloudinary(templateRecord.header) ? templateRecord.header : (headerUrl || templateRecord.header);
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

        const buildPayload = () => JSON.stringify({
          messaging_product: "whatsapp",
          to: contact.phone.replace(/^\+/, ""),
          type: "template",
          template: { name: templateName, language: { code: templateLanguage }, ...(components.length ? { components } : {}) },
        });

        let res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
          body: buildPayload(),
        });
        let data = await res.json();

        // Rate limited — pause entire queue 60s then retry this contact
        if (data?.error?.code === 130429 || data?.error?.code === 131056) {
          console.warn(`[Broadcast] Rate limited at contact ${i + 1}/${contacts.length}, pausing 60s...`);
          await new Promise((r) => setTimeout(r, 60000));
          res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
            body: buildPayload(),
          });
          data = await res.json();
        }

        const messageId = data?.messages?.[0]?.id ?? null;
        const metaError = data?.error
          ? `[${data.error.code}] ${data.error.message}${data.error.error_data?.details ? " — " + data.error.error_data.details : ""}`
          : null;
        const status = res.ok && messageId ? "sent" : "failed";

        if (status === "sent") sentCount++;
        else {
          failedCount++;
          console.error(`[Broadcast] FAILED ${i + 1}/${contacts.length} phone=${contact.phone}`, metaError ?? `HTTP ${res.status}`);
          // 131049 = Meta permanently blocked delivery for this contact — opt them out
          if (data?.error?.code === 131049 || data?.error?.code === 131026) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: { optedOut: true },
            }).catch(() => {});
            console.log(`[Broadcast] Auto opted-out ${contact.phone} due to error ${data.error.code}`);
          }
        }

        await prisma.broadcastLog.create({
          data: { broadcastId: broadcast.id, contactId: contact.id, phone: contact.phone, status, messageId, errorReason: metaError },
        });
      } catch (err) {
        failedCount++;
        console.error(`[Broadcast] EXCEPTION phone=${contact.phone}`, err);
        await prisma.broadcastLog.create({
          data: { broadcastId: broadcast.id, contactId: contact.id, phone: contact.phone, status: "failed", errorReason: String(err) },
        });
      }

      // 1 message per second — matches WATI pacing, avoids 131049
      await new Promise((r) => setTimeout(r, 1000));
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
