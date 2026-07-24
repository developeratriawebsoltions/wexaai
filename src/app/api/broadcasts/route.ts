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

  const { campaignName, templateName, audience, contactIds, headerUrl } = await req.json();
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
    select: { id: true, phone: true },
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

  // Send to each contact via Meta API and save logs
  let sentCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    try {
      const components: Array<{ type: string; parameters?: Array<{ type: string; image?: { link: string } }> }> = [];

      if (templateRecord?.headerType === "IMAGE") {
        const mediaLink = headerUrl || templateRecord.header;
        if (!mediaLink) {
          throw new Error("Please provide a header URL for this image template");
        }
        components.push({
          type: "header",
          parameters: [{ type: "image", image: { link: mediaLink } }],
        });
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${wa.accessToken}`,
          },
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
        }
      );

      const data = await res.json();
      const messageId = data?.messages?.[0]?.id ?? null;
      const status = res.ok && messageId ? "sent" : "failed";

      if (status === "sent") sentCount++;
      else failedCount++;

      await prisma.broadcastLog.create({
        data: {
          broadcastId: broadcast.id,
          contactId: contact.id,
          phone: contact.phone,
          status,
          messageId,
        },
      });
    } catch {
      failedCount++;
      await prisma.broadcastLog.create({
        data: {
          broadcastId: broadcast.id,
          contactId: contact.id,
          phone: contact.phone,
          status: "failed",
        },
      });
    }
  }

  // Update final counts
  const updated = await prisma.broadcast.update({
    where: { id: broadcast.id },
    data: {
      status: "completed",
      sentCount,
      failedCount,
    },
  });

  return NextResponse.json(updated, { status: 201 });
}
