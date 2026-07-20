import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

async function getWorkspaceId(userId: string) {
  const m = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return m?.workspaceId ?? null;
}

// GET /api/inbox/conversations?status=open&search=xxx
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // open | resolved | pending | null = all
  const search = searchParams.get("search") ?? "";

  const conversations = await prisma.conversation.findMany({
    where: {
      workspaceId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { contactPhone: { contains: search } },
              { contactName: { contains: search, mode: "insensitive" } },
              { lastMessage: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      contactPhone: true,
      contactName: true,
      lastMessage: true,
      lastMessageAt: true,
      unreadCount: true,
      status: true,
    },
  });

  return NextResponse.json(conversations);
}
