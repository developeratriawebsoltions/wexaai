import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  try {
    const { id } = await params;
    const { nodes, edges, name, status } = await req.json();

    await prisma.flow.update({
      where: { id, workspaceId },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
      },
    });

    if (nodes !== undefined) {
      const nodeIds = nodes.map((n: NodeInput) => n.id).filter(Boolean) as string[];
      const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
      if (duplicateNodeIds.length > 0) {
        return NextResponse.json(
          { error: `Duplicate node IDs detected: ${[...new Set(duplicateNodeIds)].join(", ")}` },
          { status: 400 }
        );
      }

      await prisma.flowNode.deleteMany({ where: { flowId: id } });
      if (nodes.length > 0) {
        try {
          await prisma.flowNode.createMany({
            data: nodes.map((n: NodeInput) => ({
              id: n.id,                        // preserve ReactFlow id
              flowId: id,
              type: n.type ?? "trigger",
              positionX: n.position?.x ?? 0,
              positionY: n.position?.y ?? 0,
              config: (n.data ?? {}) as object,
            })),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("Unique constraint failed on the fields: (`id`)") || message.includes("Unique constraint failed on the fields: (`id`)")) {
            return NextResponse.json({ error: "Duplicate flow node IDs were detected while updating the flow." }, { status: 400 });
          }
          throw error;
        }
      }
    }

    if (edges !== undefined) {
      await prisma.flowEdge.deleteMany({ where: { flowId: id } });
      if (edges.length > 0) {
        await prisma.flowEdge.createMany({
          data: edges.map((e: EdgeInput) => ({
            flowId: id,
            source: e.source,               // already ReactFlow ids — match nodes
            target: e.target,
            sourceHandle: e.sourceHandle ?? null,
          })),
        });
      }
    }

    const flow = await prisma.flow.findUniqueOrThrow({
      where: { id },
      include: { nodes: true, edges: true },
    });

    return NextResponse.json(formatFlow(flow));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/flows/:id] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  await prisma.flow.delete({ where: { id, workspaceId } });
  return NextResponse.json({ success: true });
}
