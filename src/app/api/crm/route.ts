import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const contacts = await prisma.contact.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      tags: true,
      customFields: true,
      createdAt: true,
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { lastMessage: true, lastMessageAt: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ contacts });
}

// PATCH /api/crm — update contact stage
export async function PATCH(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { contactId, stage } = await req.json();
  if (!contactId || !stage) return NextResponse.json({ error: "contactId and stage required" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = (contact.customFields && typeof contact.customFields === "object")
    ? contact.customFields as Record<string, unknown>
    : {};

  const parsedTags: string[] = JSON.parse(contact.tags || "[]");
  const newTags = JSON.stringify(parsedTags.includes("lead") ? parsedTags : [...parsedTags, "lead"]);

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      tags: newTags,
      customFields: { ...existing, stage, stageUpdatedAt: new Date().toISOString() },
    },
  });

  return NextResponse.json(updated);
}
