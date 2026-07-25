import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET /api/inbox/conversations?status=open&search=xxx&mine=true
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // open | resolved | pending | null = all
  const search = searchParams.get("search") ?? "";
  const mine = searchParams.get("mine") === "true";

  const conversations = await prisma.conversation.findMany({
    where: {
      workspaceId,
      ...(mine ? { assignedTo: user.id } : {}),
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
      assignedTo: true,
    },
  });

  return NextResponse.json(conversations);
}
