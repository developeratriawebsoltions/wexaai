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

  const invoices = await prisma.invoice.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } } },
  });

  return NextResponse.json({ invoices });
}
