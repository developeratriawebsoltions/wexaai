import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";
import fs from "fs";
import path from "path";

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

  // ensure uploads dir exists
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.promises.mkdir(uploadsDir, { recursive: true });
  } catch (e) {
    // ignore
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const savePath = path.join(uploadsDir, safeName);
  await fs.promises.writeFile(savePath, buffer);

  const publicUrl = `/uploads/${safeName}`;

  // Save message to DB (no external send to WhatsApp in this route)
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
}
