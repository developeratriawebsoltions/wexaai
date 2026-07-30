import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const replies = await prisma.quickReply.findMany({
    where: {
      workspaceId,
      ...(search ? {
        OR: [
          { title: { contains: search } },
          { message: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(replies);
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { title, message } = await req.json();
  if (!title?.trim() || !message?.trim())
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });

  const reply = await prisma.quickReply.create({
    data: { workspaceId, title: title.trim(), message: message.trim() },
  });

  return NextResponse.json(reply, { status: 201 });
}
