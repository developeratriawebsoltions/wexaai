import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ count: 0 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json({ count: 0 });

  const result = await prisma.conversation.aggregate({
    where: { workspaceId: membership.workspaceId, status: "open" },
    _sum: { unreadCount: true },
  });

  return NextResponse.json({ count: result._sum.unreadCount ?? 0 });
}
