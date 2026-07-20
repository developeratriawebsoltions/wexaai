import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET /api/conversations?status=open&search=&page=1&limit=20
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    workspaceId,
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { contactPhone: { contains: search } },
        { contactName: { contains: search, mode: "insensitive" as const } },
        { lastMessage: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, contactPhone: true, contactName: true,
        lastMessage: true, lastMessageAt: true, unreadCount: true,
        status: true, assignedTo: true, contactId: true, createdAt: true,
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return NextResponse.json({ conversations, total, page, limit });
}
