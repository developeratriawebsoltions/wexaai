import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

// POST — update two-way sync webhook URL (Google Apps Script URL)
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { appsScriptUrl } = await req.json();
  if (!appsScriptUrl) return NextResponse.json({ error: "appsScriptUrl is required" }, { status: 400 });

  const integration = await prisma.googleSheetIntegration.update({
    where: { workspaceId },
    data: { appsScriptUrl },
  });

  return NextResponse.json(integration);
}

// This is called internally when a conversation status changes
export async function pushStatusToSheet(workspaceId: string, data: {
  phone: string;
  name: string;
  status: string;
  lastMessage: string;
  updatedAt: string;
}) {
  const integration = await prisma.googleSheetIntegration.findUnique({
    where: { workspaceId },
    select: { appsScriptUrl: true },
  });

  if (!integration?.appsScriptUrl) return;

  try {
    await fetch(integration.appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("[Two-way sync] Failed to push to Sheet:", err);
  }
}
