import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const wa = await prisma.whatsAppAccount.findUnique({
    where: { workspaceId: membership.workspaceId },
  });
  if (!wa) return NextResponse.json({ error: "No WA account" }, { status: 404 });

  // Step 1: Start upload session
  const sessionRes = await fetch(`https://graph.facebook.com/v21.0/app/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${wa.accessToken}`,
    },
    body: JSON.stringify({
      file_length: 346003,
      file_type: "image/jpeg",
    }),
  });
  const sessionData = await sessionRes.json();

  return NextResponse.json({
    step: "upload_session",
    status: sessionRes.status,
    response: sessionData,
  });
}
