import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

async function getWorkspaceId(userId: string) {
  const m = await prisma.workspaceMember.findFirst({ where: { userId } });
  return m?.workspaceId ?? null;
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const agent = await prisma.aiAgent.upsert({
    where: { workspaceId },
    update: {},
    create: { workspaceId },
  });

  return NextResponse.json(agent);
}

export async function PATCH(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const body = await req.json();
  const { name, systemPrompt, model, temperature, language, autoReply, fallbackType, businessHours } = body;

  const agent = await prisma.aiAgent.upsert({
    where: { workspaceId },
    update: { name, systemPrompt, model, temperature, language, autoReply, fallbackType, businessHours },
    create: { workspaceId, name, systemPrompt, model, temperature, language, autoReply, fallbackType, businessHours },
  });

  return NextResponse.json(agent);
}
