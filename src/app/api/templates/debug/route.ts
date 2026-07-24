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

  // Fetch WABA details to check account status and country
  const wabaRes = await fetch(
    `https://graph.facebook.com/v21.0/${wa.wabaId}?fields=id,name,currency,timezone_id,message_template_namespace,on_behalf_of_business_info`,
    { headers: { Authorization: `Bearer ${wa.accessToken}` } }
  );
  const wabaData = await wabaRes.json();

  // Fetch existing templates to see what languages Meta already has for this WABA
  const tmplRes = await fetch(
    `https://graph.facebook.com/v21.0/${wa.wabaId}/message_templates?limit=5&fields=name,language,status`,
    { headers: { Authorization: `Bearer ${wa.accessToken}` } }
  );
  const tmplData = await tmplRes.json();

  // Try creating a minimal template with en_US to see exact error
  const testRes = await fetch(
    `https://graph.facebook.com/v21.0/${wa.wabaId}/message_templates`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${wa.accessToken}` },
      body: JSON.stringify({
        name: "debug_test_delete_me",
        category: "UTILITY",
        language: "en_US",
        components: [{ type: "BODY", text: "debug test" }],
      }),
    }
  );
  const testData = await testRes.json();

  return NextResponse.json({ wabaId: wa.wabaId, wabaDetails: wabaData, existingTemplates: tmplData, testWithEnUS: testData });
}
