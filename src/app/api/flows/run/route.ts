import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FlowNodeLike = {
  id: string;
  type: string;
  config?: unknown | null;
};

type FlowEdgeLike = {
  source: string;
  target?: string | null;
};

// POST /api/flows/run — called by webhook with { workspaceId, phone, message }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  const message = typeof body.message === "string" ? body.message : "";

  if (!workspaceId || !message || !phone) {
    return NextResponse.json(
      { error: "workspaceId, phone and message required" },
      { status: 400 }
    );
  }

  const flows = await prisma.flow.findMany({
    where: { workspaceId, status: "active" },
    include: { nodes: true, edges: true },
  });

  const normalizedMessage = message.toLowerCase();

  for (const flow of flows) {
    const trigger = flow.nodes.find((node: FlowNodeLike) => node.type === "trigger");
    if (!trigger) continue;

    const triggerConfig =
      trigger.config && typeof trigger.config === "object" && !Array.isArray(trigger.config)
        ? (trigger.config as Record<string, unknown>)
        : {};

    const keyword = typeof triggerConfig.keyword === "string" ? triggerConfig.keyword.toLowerCase() : "";
    if (keyword && !normalizedMessage.includes(keyword)) continue;

    const executed = new Set<string>();
    let currentNodeId: string | null = trigger.id;
    let conditionFailed = false;
    let chainCompleted = false;

    while (currentNodeId) {
      if (executed.has(currentNodeId)) break;
      executed.add(currentNodeId);

      const node = flow.nodes.find((candidate: FlowNodeLike) => candidate.id === currentNodeId);
      if (!node) break;

      const nodeConfig =
        node.config && typeof node.config === "object" && !Array.isArray(node.config)
          ? (node.config as Record<string, unknown>)
          : {};

      if (node.type === "condition") {
        const contains = typeof nodeConfig.contains === "string" ? nodeConfig.contains.toLowerCase() : "";
        if (contains && !normalizedMessage.includes(contains)) {
          conditionFailed = true;
          break;
        }
      }

      if (node.type === "action") {
        const action = typeof nodeConfig.action === "string" ? nodeConfig.action : "";
        if (action === "wait") {
          // In production: queue delayed job. Here we skip.
        }
      }

      const nextEdge = flow.edges.find((edge: FlowEdgeLike) => edge.source === currentNodeId);
      currentNodeId = nextEdge?.target ?? null;

      if (!currentNodeId) {
        chainCompleted = true;
      }
    }

    if (chainCompleted && !conditionFailed) {
      return NextResponse.json({
        matched: true,
        flowId: flow.id,
        flowName: flow.name,
        phone,
      });
    }
  }

  return NextResponse.json({ matched: false });
}
