import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

// GET /api/media — fetch workspace media library
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const assets = await prisma.mediaAsset.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(assets);
}
