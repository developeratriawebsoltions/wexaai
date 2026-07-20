import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const now = new Date();
  const day7ago = new Date(now);
  day7ago.setDate(now.getDate() - 7);
  const day14ago = new Date(now);
  day14ago.setDate(now.getDate() - 14);

  const [
    totalConversations, prevConversations,
    totalContacts, prevContacts,
    totalMessages, prevMessages,
    aiAgent,
    knowledgeCount,
    needsAttention,
    activeAgents,
    directionTotals,
    topAgentsGroup,
  ] = await Promise.all([
    prisma.conversation.count({ where: { workspaceId, createdAt: { gte: day7ago } } }),
    prisma.conversation.count({ where: { workspaceId, createdAt: { gte: day14ago, lt: day7ago } } }),
    prisma.contact.count({ where: { workspaceId, createdAt: { gte: day7ago } } }),
    prisma.contact.count({ where: { workspaceId, createdAt: { gte: day14ago, lt: day7ago } } }),
    prisma.message.count({ where: { workspaceId, createdAt: { gte: day7ago } } }),
    prisma.message.count({ where: { workspaceId, createdAt: { gte: day14ago, lt: day7ago } } }),
    prisma.aiAgent.findUnique({ where: { workspaceId } }),
    prisma.knowledgeBase.count({ where: { workspaceId } }),
    prisma.conversation.count({ where: { workspaceId, status: "needs_attention" } }),
    prisma.workspaceMember.count({ where: { workspaceId, role: { in: ["agent", "manager", "owner"] } } }),
    Promise.all(["inbound", "outbound"].map((direction) =>
      prisma.message.count({ where: { workspaceId, direction, createdAt: { gte: day7ago } } })
    )),
    prisma.conversation.groupBy({
      by: ["assignedTo"],
      where: { workspaceId, assignedTo: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 3,
    }),
  ]);

  const messagesByDirection = [
    { name: "Inbound", count: directionTotals[0], color: "#22c55e" },
    { name: "Outbound", count: directionTotals[1], color: "#60a5fa" },
  ];

  const totalDirection = messagesByDirection.reduce((sum, item) => sum + item.count, 0);
  const directionBreakdown = messagesByDirection.map((item) => ({
    ...item,
    pct: totalDirection ? Math.round((item.count / totalDirection) * 100) : 0,
  }));

  const topAgents = await Promise.all(
    topAgentsGroup.map(async (entry: { assignedTo: string | null; _count: { id: number } }) => {
      const agentUser = entry.assignedTo
        ? await prisma.user.findUnique({ where: { id: entry.assignedTo } })
        : null;
      return {
        id: entry.assignedTo ?? "",
        name: agentUser?.name ?? "Unknown Agent",
        conversations: entry._count.id,
        resolution: "—",
        rating: "—",
      };
    })
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const chartData = await Promise.all(
    days.map(async (dayStart) => {
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const [inbound, outbound] = await Promise.all([
        prisma.message.count({ where: { workspaceId, direction: "inbound", createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.message.count({ where: { workspaceId, direction: "outbound", createdAt: { gte: dayStart, lt: dayEnd } } }),
      ]);
      return {
        label: dayStart.toLocaleDateString("en", { weekday: "short" }),
        inbound,
        outbound,
      };
    })
  );

  function pct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? "+100%" : "0%";
    const diff = ((curr - prev) / prev) * 100;
    return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
  }

  return NextResponse.json({
    stats: {
      totalConversations,
      totalContacts,
      totalMessages,
      convChange: pct(totalConversations, prevConversations),
      contactChange: pct(totalContacts, prevContacts),
      msgChange: pct(totalMessages, prevMessages),
    },
    aiAgent: {
      name: aiAgent?.name ?? "Wexa Assistant",
      autoReply: aiAgent?.autoReply ?? false,
      model: aiAgent?.model ?? "gpt-4o-mini",
      knowledgeCount,
      needsAttention,
    },
    activeAgents,
    messagesByDirection: directionBreakdown,
    topAgents,
    chartData,
  });
}
