import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by Vercel Cron every minute: GET /api/broadcasts/process-scheduled
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.broadcast.findMany({
    where: { status: "scheduled", scheduledAt: { lte: now } },
    include: { logs: { where: { status: "queued" }, select: { id: true, contactId: true, phone: true } } },
  });

  if (due.length === 0) return NextResponse.json({ processed: 0 });

  for (const broadcast of due) {
    // Mark as sending immediately to prevent double-processing
    await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: "sending" } });

    const wa = await prisma.whatsAppAccount.findUnique({ where: { workspaceId: broadcast.workspaceId } });
    if (!wa) {
      await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: "failed" } });
      continue;
    }

    const templateRecord = await prisma.template.findFirst({
      where: { workspaceId: broadcast.workspaceId, name: broadcast.templateName },
      select: { language: true, headerType: true, header: true, body: true },
    });
    const templateLanguage = templateRecord?.language ?? "en";
    const bodyVarMatches = templateRecord ? [...templateRecord.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1])) : [];
    const bodyVarCount = bodyVarMatches.length > 0 ? Math.max(...bodyVarMatches) : 0;

    const queuedLogs = broadcast.logs;
    let sentCount = 0;
    let failedCount = 0;
    const CHUNK_SIZE = 10;

    for (let i = 0; i < queuedLogs.length; i += CHUNK_SIZE) {
      const chunk = queuedLogs.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (log) => {
          const contact = await prisma.contact.findUnique({
            where: { id: log.contactId },
            select: { name: true, phone: true },
          });
          try {
            const components: Array<{ type: string; parameters?: Array<{ type: string; text?: string; image?: { link: string } }> }> = [];

            if (templateRecord?.headerType === "IMAGE") {
              const isCloudinary = (u?: string | null) => !!u && u.includes("cloudinary.com");
              const mediaLink = isCloudinary(templateRecord.header) ? templateRecord.header : templateRecord.header;
              if (!mediaLink) throw new Error("No header URL for image template");
              components.push({ type: "header", parameters: [{ type: "image", image: { link: mediaLink } }] });
            }
            if (bodyVarCount > 0) {
              const bodyParams = Array.from({ length: bodyVarCount }, () => ({
                type: "text",
                text: contact?.name || log.phone,
              }));
              components.push({ type: "body", parameters: bodyParams });
            }

            const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: log.phone.replace(/^\+/, ""),
                type: "template",
                template: {
                  name: broadcast.templateName,
                  language: { code: templateLanguage },
                  ...(components.length ? { components } : {}),
                },
              }),
            });

            const data = await res.json();
            const messageId = data?.messages?.[0]?.id ?? null;
            const status = res.ok && messageId ? "sent" : "failed";
            if (status === "sent") sentCount++; else failedCount++;

            await prisma.broadcastLog.update({
              where: { id: log.id },
              data: { status, messageId: messageId ?? undefined },
            });
          } catch {
            failedCount++;
            await prisma.broadcastLog.update({ where: { id: log.id }, data: { status: "failed" } });
          }
        })
      );
      if (i + CHUNK_SIZE < queuedLogs.length) await new Promise((r) => setTimeout(r, 300));
    }

    await prisma.broadcast.update({
      where: { id: broadcast.id },
      data: { status: "completed", sentCount, failedCount },
    });
  }

  return NextResponse.json({ processed: due.length });
}
