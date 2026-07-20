import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET /api/broadcasts/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;

  const broadcast = await prisma.broadcast.findFirst({
    where: { id, workspaceId },
    include: { logs: { orderBy: { createdAt: "desc" } } },
  });

  if (!broadcast) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(broadcast);
}
