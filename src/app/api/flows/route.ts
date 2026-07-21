import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

type NodeInput = {
  id?: string;
  type?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
};

type EdgeInput = {
  source: string;
  target: string;
  sourceHandle?: string | null;
};

function formatFlow(flow: {
  id: string; workspaceId: string; name: string; status: string;
  createdAt: Date; updatedAt: Date;
  nodes: { id: string; type: string; positionX: number; positionY: number; config: unknown }[];
  edges: { id: string; source: string; target: string; sourceHandle?: string | null }[];
}) {
  return {
    id: flow.id,
    workspaceId: flow.workspaceId,
    name: flow.name,
    status: flow.status,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
    nodes: flow.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.positionX, y: n.positionY },
      data: (n.config ?? {}) as Record<string, unknown>,
    })),
    edges: flow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    })),
  };
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const flows = await prisma.flow.findMany({
    where: { workspaceId },
    include: { nodes: true, edges: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(flows.map(formatFlow));
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { name, nodes = [], edges = [], status = "draft" }:
    { name: string; nodes: NodeInput[]; edges: EdgeInput[]; status: string } = await req.json();

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const flow = await prisma.flow.create({ data: { workspaceId, name, status } });

  if (nodes.length > 0) {
    const nodeIds = nodes.map((n) => n.id).filter(Boolean) as string[];
    const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateNodeIds.length > 0) {
      return NextResponse.json(
        { error: `Duplicate node IDs detected: ${[...new Set(duplicateNodeIds)].join(", ")}` },
        { status: 400 }
      );
    }

    try {
      await prisma.flowNode.createMany({
        data: nodes.map((n) => ({
          id: n.id,                          // preserve ReactFlow id
          flowId: flow.id,
          type: n.type ?? "trigger",
          positionX: n.position?.x ?? 0,
          positionY: n.position?.y ?? 0,
          config: (n.data ?? {}) as object,
        })),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Unique constraint failed on the fields: (`id`)") || message.includes("Unique constraint failed on the fields: (`id`)")) {
        return NextResponse.json({ error: "Duplicate flow node IDs were detected while saving the flow." }, { status: 400 });
      }
      throw error;
    }
  }

  if (edges.length > 0) {
    await prisma.flowEdge.createMany({
      data: edges.map((e) => ({
        flowId: flow.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
      })),
    });
  }

  const created = await prisma.flow.findUniqueOrThrow({
    where: { id: flow.id },
    include: { nodes: true, edges: true },
  });

  return NextResponse.json(formatFlow(created), { status: 201 });
}
