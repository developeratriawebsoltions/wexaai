import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";
import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_URL = process.env.CLOUDINARY_URL || "cloudinary://429828736883821:PH8Yr3YKv41uPkP3Rg6b-h3ylGQ@dy1txmkod";

cloudinary.config({
  cloudinary_url: CLOUDINARY_URL,
  secure: true,
});

async function getWorkspaceId(userId: string) {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return m?.workspaceId ?? null;
}

// POST /api/inbox/conversations/[id]/media
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "wexa-ai/inbox",
          resource_type: "auto",
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );

      stream.end(buffer);
    });

    const publicUrl = uploadResult.secure_url;

    // Save message to DB
    const [conversation, waAccount] = await Promise.all([
      prisma.conversation.findFirst({ where: { id, workspaceId } }),
      prisma.whatsAppAccount.findUnique({ where: { workspaceId } }),
    ]);

    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    if (!waAccount || waAccount.status !== "active") {
      return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
    }

    const normalizedTo = conversation.contactPhone.replace(/^\+/, "");
    const mediaType = file.type?.startsWith("video/") ? "video" : file.type?.startsWith("image/") ? "image" : "document";
    const metaPayload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to: normalizedTo,
      type: mediaType,
    };

    if (mediaType === "image") {
      (metaPayload as any).image = { link: publicUrl, caption: file.name };
    } else if (mediaType === "video") {
      (metaPayload as any).video = { link: publicUrl, caption: file.name };
    } else {
      (metaPayload as any).document = { link: publicUrl, filename: file.name, caption: file.name };
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${waAccount.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${waAccount.accessToken}`,
        },
        body: JSON.stringify(metaPayload),
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      const failedMessage = await prisma.message.create({
        data: {
          workspaceId,
          conversationId: id,
          contactId: conversation.contactId,
          from: waAccount.phoneNumberId,
          text: file.name,
          direction: "outbound",
          status: "failed",
          messageType: "media",
          mediaUrl: publicUrl,
        },
      });

      await prisma.conversation.update({ where: { id }, data: { lastMessage: file.name, lastMessageAt: new Date() } });

      return NextResponse.json(
        {
          error: metaData.error?.message ?? "Failed to send media message",
          message: {
            id: failedMessage.id,
            text: failedMessage.text,
            direction: failedMessage.direction,
            status: failedMessage.status,
            createdAt: failedMessage.createdAt,
            mediaUrl: failedMessage.mediaUrl,
            messageType: failedMessage.messageType,
          },
        },
        { status: 400 }
      );
    }

    const waMessageId = metaData.messages?.[0]?.id;

    const message = await prisma.message.create({
      data: {
        workspaceId,
        conversationId: id,
        contactId: conversation.contactId,
        from: waAccount.phoneNumberId,
        text: file.name,
        waMessageId,
        direction: "outbound",
        status: "sent",
        messageType: "media",
        mediaUrl: publicUrl,
      },
    });

    await prisma.conversation.update({ where: { id }, data: { lastMessage: file.name, lastMessageAt: new Date() } });

    return NextResponse.json({
      id: message.id,
      text: message.text,
      direction: message.direction,
      status: message.status,
      createdAt: message.createdAt,
      mediaUrl: message.mediaUrl,
      messageType: message.messageType,
    });
  } catch (error: any) {
    console.error("[Inbox Media Upload] Error", error);
    return NextResponse.json({ error: error?.message || "Failed to upload media" }, { status: 500 });
  }
}
