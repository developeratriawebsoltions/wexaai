import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

type FlowWithRelations = {
  id: string;
  workspaceId: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  nodes: Array<{
    id: string;
    type: string;
    positionX: number;
    positionY: number;
    config: unknown | null;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
};

type NodeInput = {
  type?: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
};

type EdgeInput = {
  source: string;
  target: string;
};

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const flows: FlowWithRelations[] = await prisma.flow.findMany({
    where: { workspaceId },
    include: { nodes: true, edges: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    flows.map((f: FlowWithRelations) => ({
      id: f.id,
      workspaceId: f.workspaceId,
      name: f.name,
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      nodes: f.nodes.map((n: FlowWithRelations["nodes"][number]) => ({
        id: n.id,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: n.config,
      })),
      edges: f.edges.map((e: FlowWithRelations["edges"][number]) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const {
    name,
    nodes = [],
    edges = [],
    status = "draft",
  }: { name: string; nodes: NodeInput[]; edges: EdgeInput[]; status: string } =
    await req.json();

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const flow = await prisma.flow.create({
    data: { workspaceId, name, status },
  });

  if (nodes.length > 0) {
    await prisma.flowNode.createMany({
      data: nodes.map((n) => ({
        flowId: flow.id,
        type: n.type ?? "trigger",
        positionX: n.position?.x ?? 0,
        positionY: n.position?.y ?? 0,
        config: (n.data ?? {}) as object,
      })),
    });
  }

  if (edges.length > 0) {
    await prisma.flowEdge.createMany({
      data: edges.map((e) => ({ flowId: flow.id, source: e.source, target: e.target })),
    });
  }

  const created: FlowWithRelations = await prisma.flow.findUniqueOrThrow({
    where: { id: flow.id },
    include: { nodes: true, edges: true },
  });

  return NextResponse.json(
    {
      id: created.id,
      workspaceId: created.workspaceId,
      name: created.name,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      nodes: created.nodes.map((n: FlowWithRelations["nodes"][number]) => ({
        id: n.id,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: n.config,
      })),
      edges: created.edges.map((e: FlowWithRelations["edges"][number]) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    },
    { status: 201 }
  );
}
