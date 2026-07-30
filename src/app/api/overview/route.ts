import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const now = new Date();
  const day7ago  = new Date(now); day7ago.setDate(now.getDate() - 7);
  const day14ago = new Date(now); day14ago.setDate(now.getDate() - 14);
  const chartStart = new Date(now); chartStart.setDate(now.getDate() - 6); chartStart.setHours(0, 0, 0, 0);

  // ── MySQL-compatible raw queries ──────────────────────────────────────────

  // 1. Aggregate stats (MySQL uses IF instead of FILTER, backtick identifiers)
  const statsRaw = await prisma.$queryRaw<{
    conv7: bigint; conv14: bigint;
    contact7: bigint; contact14: bigint;
    msg7: bigint; msg14: bigint;
    out7: bigint; out14: bigint;
    needs_attention: bigint;
    active_agents: bigint;
    knowledge_count: bigint;
  }[]>`
    SELECT
      SUM(IF(t = 'conv'    AND createdAt >= ${day7ago},                              1, 0)) AS conv7,
      SUM(IF(t = 'conv'    AND createdAt >= ${day14ago} AND createdAt < ${day7ago},  1, 0)) AS conv14,
      SUM(IF(t = 'contact' AND createdAt >= ${day7ago},                              1, 0)) AS contact7,
      SUM(IF(t = 'contact' AND createdAt >= ${day14ago} AND createdAt < ${day7ago},  1, 0)) AS contact14,
      SUM(IF(t = 'msg'     AND createdAt >= ${day7ago},                              1, 0)) AS msg7,
      SUM(IF(t = 'msg'     AND createdAt >= ${day14ago} AND createdAt < ${day7ago},  1, 0)) AS msg14,
      SUM(IF(t = 'msg'     AND direction = 'outbound' AND createdAt >= ${day7ago},   1, 0)) AS out7,
      SUM(IF(t = 'msg'     AND direction = 'outbound' AND createdAt >= ${day14ago} AND createdAt < ${day7ago}, 1, 0)) AS out14,
      SUM(IF(t = 'conv'    AND status = 'needs_attention',                            1, 0)) AS needs_attention,
      (SELECT COUNT(*) FROM WorkspaceMember WHERE workspaceId = ${workspaceId} AND role IN ('agent','manager','owner')) AS active_agents,
      (SELECT COUNT(*) FROM KnowledgeBase   WHERE workspaceId = ${workspaceId})               AS knowledge_count
    FROM (
      SELECT 'conv'    AS t, createdAt, status, NULL       AS direction FROM Conversation WHERE workspaceId = ${workspaceId}
      UNION ALL
      SELECT 'contact' AS t, createdAt, NULL,   NULL       AS direction FROM Contact      WHERE workspaceId = ${workspaceId}
      UNION ALL
      SELECT 'msg'     AS t, createdAt, NULL,   direction  AS direction FROM Message      WHERE workspaceId = ${workspaceId}
    ) combined
  `;

  // 2. Top agents
  const agentRaw = await prisma.$queryRaw<{ id: string; name: string; conversations: bigint }[]>`
    SELECT u.id, u.name, COUNT(c.id) AS conversations
    FROM Conversation c
    JOIN User u ON u.id = c.assignedTo
    WHERE c.workspaceId = ${workspaceId} AND c.assignedTo IS NOT NULL
    GROUP BY u.id, u.name
    ORDER BY conversations DESC
    LIMIT 3
  `;

  // 3. Chart data — MySQL uses DATE() instead of DATE_TRUNC
  const chartRaw = await prisma.$queryRaw<{ day: Date; direction: string; count: bigint }[]>`
    SELECT DATE(createdAt) AS day, direction, COUNT(*) AS count
    FROM Message
    WHERE workspaceId = ${workspaceId} AND createdAt >= ${chartStart}
    GROUP BY DATE(createdAt), direction
  `;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const s = statsRaw[0];
  const n = (v: bigint | null | undefined) => Number(v ?? 0);

  function pct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? "+100%" : "0%";
    const diff = ((curr - prev) / prev) * 100;
    return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
  }

  const totalMessages         = n(s.msg7);
  const totalOutboundMessages = n(s.out7);
  const inboundTotal          = totalMessages - totalOutboundMessages;

  // ── Chart ─────────────────────────────────────────────────────────────────
  const chartMap = new Map<string, { inbound: number; outbound: number }>();
  for (const row of chartRaw) {
    // DATE() in MySQL returns a date object; convert to the same short weekday label
    const key = new Date(row.day).toLocaleDateString("en", { weekday: "short" });
    if (!chartMap.has(key)) chartMap.set(key, { inbound: 0, outbound: 0 });
    const entry = chartMap.get(key)!;
    if (row.direction === "inbound") entry.inbound = n(row.count);
    else entry.outbound = n(row.count);
  }
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const label = d.toLocaleDateString("en", { weekday: "short" });
    return { label, ...(chartMap.get(label) ?? { inbound: 0, outbound: 0 }) };
  });

  // ── AI Agent row ──────────────────────────────────────────────────────────
  const aiAgent = await prisma.aiAgent.findUnique({ where: { workspaceId } });

  return NextResponse.json({
    stats: {
      totalConversations:     n(s.conv7),
      totalContacts:          n(s.contact7),
      totalMessages,
      totalOutboundMessages,
      convChange:             pct(n(s.conv7),    n(s.conv14)),
      contactChange:          pct(n(s.contact7), n(s.contact14)),
      msgChange:              pct(totalMessages,  n(s.msg14)),
      outboundMsgChange:      pct(totalOutboundMessages, n(s.out14)),
    },
    aiAgent: {
      name:           aiAgent?.name      ?? "Wexa Assistant",
      autoReply:      aiAgent?.autoReply ?? false,
      model:          aiAgent?.model     ?? "gpt-4o-mini",
      knowledgeCount: n(s.knowledge_count),
      needsAttention: n(s.needs_attention),
    },
    activeAgents: n(s.active_agents),
    messagesByDirection: [
      { name: "Inbound",  count: inboundTotal,          color: "#22c55e", pct: totalMessages ? Math.round((inboundTotal          / totalMessages) * 100) : 0 },
      { name: "Outbound", count: totalOutboundMessages, color: "#60a5fa", pct: totalMessages ? Math.round((totalOutboundMessages / totalMessages) * 100) : 0 },
    ],
    topAgents:  agentRaw.map((e) => ({ id: e.id, name: e.name, conversations: n(e.conversations), resolution: "—", rating: "—" })),
    chartData,
  });
}
