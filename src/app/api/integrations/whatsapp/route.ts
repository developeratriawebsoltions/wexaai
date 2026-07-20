import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

async function getWorkspaceId(userId: string): Promise<string | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  return membership?.workspaceId ?? null;
}

// GET — fetch current WhatsApp connection for workspace
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const account = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
  if (!account) return NextResponse.json(null);

  // Never expose raw access token to frontend
  return NextResponse.json({
    id: account.id,
    businessName: account.businessName,
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId,
    status: account.status,
    createdAt: account.createdAt,
  });
}

// POST — verify with Meta API then save credentials
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { businessName, phoneNumberId, wabaId, accessToken } = await req.json();

  if (!businessName || !phoneNumberId || !wabaId || !accessToken) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Verify credentials against Meta Graph API
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
  );
  const metaData = await metaRes.json();

  if (!metaRes.ok || metaData.error) {
    return NextResponse.json(
      { error: metaData.error?.message ?? "Invalid credentials. Please check your Phone Number ID and Access Token." },
      { status: 400 }
    );
  }

  // Upsert — update if exists, create if not
  const account = await prisma.whatsAppAccount.upsert({
    where: { workspaceId },
    update: { phoneNumberId, wabaId, accessToken, businessName, status: "active" },
    create: { workspaceId, phoneNumberId, wabaId, accessToken, businessName },
  });

  return NextResponse.json({
    id: account.id,
    businessName: account.businessName,
    phoneNumberId: account.phoneNumberId,
    wabaId: account.wabaId,
    status: account.status,
    verifiedName: metaData.verified_name,
    displayPhone: metaData.display_phone_number,
  });
}

// DELETE — disconnect WhatsApp
export async function DELETE(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  await prisma.whatsAppAccount.updateMany({
    where: { workspaceId },
    data: { status: "disconnected" },
  });

  return NextResponse.json({ success: true });
}
