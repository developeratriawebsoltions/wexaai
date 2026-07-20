import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: { workspace: true },
  });

  return NextResponse.json(memberships.map((m) => ({ ...m.workspace, role: m.role })));
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const baseSlug = toSlug(name);
  const slugExists = await prisma.workspace.findUnique({ where: { slug: baseSlug } });
  const slug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });

  return NextResponse.json(workspace, { status: 201 });
}
