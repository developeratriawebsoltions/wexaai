import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

type MetaTemplate = {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  rejected_reason?: string;
  components?: Array<{
    type: string;
    format?: string;
    text?: string;
    example?: { header_handle?: string[]; header_url?: string[] };
    buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  }>;
};

function extractComponent(components: MetaTemplate["components"], type: string) {
  return components?.find((c) => c.type === type);
}

// POST /api/templates/sync
export async function POST(req: NextRequest) {
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
  if (!wa || wa.status !== "active") {
    return NextResponse.json({ error: "WhatsApp not connected" }, { status: 400 });
  }

  // Fetch all templates from Meta — paginate if needed
  let allTemplates: MetaTemplate[] = [];
  let url: string | null = `https://graph.facebook.com/v19.0/${wa.wabaId}/message_templates?limit=100&access_token=${wa.accessToken}`;

  while (url) {
    const res = await fetch(url);
    const data = await res.json() as { data?: MetaTemplate[]; paging?: { next?: string }; error?: { message?: string } };

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.error?.message ?? "Failed to fetch from Meta" },
        { status: 400 }
      );
    }

    allTemplates = allTemplates.concat(data.data ?? []);
    url = data.paging?.next ?? null;
  }

  // Upsert each template into DB
  let synced = 0;
  for (const t of allTemplates) {
    const components = t.components ?? [];
    const headerComp = extractComponent(components, "HEADER");
    const bodyComp = extractComponent(components, "BODY");
    const footerComp = extractComponent(components, "FOOTER");
    const buttonsComp = extractComponent(components, "BUTTONS");

    const buttons: Prisma.InputJsonValue | typeof Prisma.JsonNull = buttonsComp?.buttons?.map((b) => ({
      type: b.type,
      text: b.text,
      url: b.url,
      phone_number: b.phone_number,
    })) ?? Prisma.JsonNull;

    await prisma.template.upsert({
      where: {
        workspaceId_name_language: {
          workspaceId: membership.workspaceId,
          name: t.name,
          language: t.language,
        },
      },
      update: {
        metaTemplateId: t.id,
        status: t.status,
        category: t.category,
        header: headerComp?.text ?? headerComp?.example?.header_url?.[0] ?? headerComp?.example?.header_handle?.[0] ?? null,
        headerType: headerComp?.format ?? null,
        body: bodyComp?.text ?? "",
        footer: footerComp?.text ?? null,
        buttons,
        rejectedReason: t.rejected_reason ?? null,
      },
      create: {
        workspaceId: membership.workspaceId,
        metaTemplateId: t.id,
        name: t.name,
        category: t.category,
        language: t.language,
        status: t.status,
        header: headerComp?.text ?? headerComp?.example?.header_url?.[0] ?? headerComp?.example?.header_handle?.[0] ?? null,
        headerType: headerComp?.format ?? null,
        body: bodyComp?.text ?? "",
        footer: footerComp?.text ?? null,
        buttons,
        rejectedReason: t.rejected_reason ?? null,
      },
    });
    synced++;
  }

  return NextResponse.json({ synced, total: allTemplates.length });
}
