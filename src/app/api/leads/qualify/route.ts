import { NextRequest, NextResponse } from "next/server";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";
import { triggerManualQualification } from "@/lib/lead-qualifier";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const result = await triggerManualQualification(workspaceId, contactId);
  return NextResponse.json(result, { status: result.success ? 200 : 404 });
}
