import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, role: "owner" },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { workspaceId } = membership;

  const [contacts, messages, aiReplies, teamMembers, subscription] = await Promise.all([
    prisma.contact.count({ where: { workspaceId } }),
    prisma.message.count({ where: { workspaceId } }),
    prisma.message.count({
      where: {
        workspaceId,
        direction: "outbound",
        from: "AI",
      },
    }),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.subscription.findUnique({ where: { workspaceId }, include: { plan: true } }),
  ]);

  return NextResponse.json({
    contacts,
    messages,
    aiUsed: aiReplies,
    teamMembers,
    plan: subscription?.plan ?? null,
  });
}
