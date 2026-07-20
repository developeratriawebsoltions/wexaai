import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  const { nodes, edges, ...rest } = await req.json();

  const flow = await prisma.flow.update({
    where: { id, workspaceId },
    data: {
      ...rest,
      ...(nodes !== undefined && {
        nodes: {
          deleteMany: {},
          create: nodes.map((n: { type?: string; position?: { x: number; y: number }; data?: Record<string, unknown> }) => ({
            type: n.type ?? "trigger",
            positionX: n.position?.x ?? 0,
            positionY: n.position?.y ?? 0,
            config: n.data ?? {},
          })),
        },
      }),
      ...(edges !== undefined && {
        edges: {
          deleteMany: {},
          create: edges.map((e: { source: string; target: string }) => ({
            source: e.source,
            target: e.target,
          })),
        },
      }),
    },
    include: { nodes: true, edges: true },
  });

  return NextResponse.json({
    ...flow,
    nodes: flow.nodes.map((n: { id: string; type: string; positionX: number; positionY: number; config: unknown }) => ({
      id: n.id,
      type: n.type,
      position: { x: n.positionX, y: n.positionY },
      data: n.config,
    })),
    edges: flow.edges.map((e: { id: string; source: string; target: string }) => ({ id: e.id, source: e.source, target: e.target })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;
  await prisma.flow.delete({ where: { id, workspaceId } });
  return NextResponse.json({ success: true });
}
