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
    const conversation = await prisma.conversation.findFirst({ where: { id, workspaceId } });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const message = await prisma.message.create({
      data: {
        workspaceId,
        conversationId: id,
        contactId: conversation.contactId,
        from: user.id,
        text: file.name,
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
