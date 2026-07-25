import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";
import crypto from "crypto";
import { sendInviteEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { email, role = "agent" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!["manager", "agent"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  // Check requester is owner/manager
  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!requester || !["owner", "manager"].includes(requester.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (alreadyMember) return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });

  // Upsert invite (replace old pending invite for same email)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.workspaceInvite.upsert({
    where: { token: (await prisma.workspaceInvite.findFirst({ where: { workspaceId, email, accepted: false } }))?.token ?? token },
    update: { token, role, expiresAt, accepted: false },
    create: { workspaceId, email, role, token, expiresAt },
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  try {
    await sendInviteEmail({ to: email, workspaceName: workspace?.name ?? "Wexa", inviteUrl, role });
  } catch (err) {
    console.error("Invite email failed", err);
    return NextResponse.json({ error: "Failed to send invite email. Check SMTP settings." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
