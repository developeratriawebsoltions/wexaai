import { NextRequest, NextResponse } from "next/server";
import { runFlow } from "@/lib/flow-runner";

// POST /api/flows/run
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const workspaceId   = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const phone         = typeof body.phone === "string" ? body.phone : "";
  const message       = typeof body.message === "string" ? body.message : "";
  const buttonPayload = typeof body.buttonPayload === "string" ? body.buttonPayload : "";

  if (!workspaceId || !phone || (!message && !buttonPayload)) {
    return NextResponse.json({ error: "workspaceId, phone and message/buttonPayload required" }, { status: 400 });
  }

  const result = await runFlow({ workspaceId, phone, message, buttonPayload });
  return NextResponse.json(result);
}
