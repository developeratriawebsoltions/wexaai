import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// GET — fetch current integration config
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const integration = await prisma.googleSheetIntegration.findUnique({ where: { workspaceId } });
  return NextResponse.json(integration ?? null);
}

// POST — save or update integration
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { sheetUrl, sheetName, syncEnabled, syncInterval, exportEnabled } = await req.json();
  if (!sheetUrl) return NextResponse.json({ error: "sheetUrl is required" }, { status: 400 });

  const integration = await prisma.googleSheetIntegration.upsert({
    where: { workspaceId },
    update: { sheetUrl, sheetName: sheetName ?? "Sheet1", syncEnabled: syncEnabled ?? false, syncInterval: syncInterval ?? 6, exportEnabled: exportEnabled ?? false },
    create: { workspaceId, sheetUrl, sheetName: sheetName ?? "Sheet1", syncEnabled: syncEnabled ?? false, syncInterval: syncInterval ?? 6, exportEnabled: exportEnabled ?? false },
  });

  return NextResponse.json(integration);
}

// DELETE — remove integration
export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  await prisma.googleSheetIntegration.deleteMany({ where: { workspaceId } });
  return NextResponse.json({ success: true });
}
