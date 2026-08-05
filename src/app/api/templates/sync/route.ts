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
    buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string; example?: string; flow_id?: string; flow_name?: string }>;
  }>;
};

function extractComponent(components: MetaTemplate["components"], type: string) {
  return components?.find((c) => c.type === type);
}

function getMetaHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

// POST /api/templates/sync
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceIdHeader = req.headers.get("x-workspace-id");

  const membership = workspaceIdHeader
    ? await prisma.workspaceMember.findFirst({
        where: { userId: user.id, workspaceId: workspaceIdHeader },
        select: { workspaceId: true },
      })
    : await prisma.workspaceMember.findFirst({
        where: { userId: user.id, role: "OWNER" },
        select: { workspaceId: true },
      }) ??
      await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        select: { workspaceId: true },
      });

  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const wa = await prisma.whatsAppAccount.findUnique({
    where: { workspaceId: membership.workspaceId },
  });

  // Log what we found to help diagnose issues
  console.log("[Sync] WhatsApp account:", wa ? {
    status: wa.status,
    hasWabaId: !!wa.wabaId,
    hasAccessToken: !!wa.accessToken,
    wabaId: wa.wabaId,
  } : "NOT FOUND");

  if (!wa) {
    return NextResponse.json({ error: "WhatsApp not connected. Please connect WhatsApp in Settings first." }, { status: 400 });
  }

  // Status check — treat any non-disconnected status as valid (consistent with how connect saves "active")
  const normalizedStatus = (wa.status ?? "").toLowerCase().trim();
  if (normalizedStatus === "disconnected") {
    return NextResponse.json({ error: "WhatsApp is disconnected. Please reconnect in Settings." }, { status: 400 });
  }

  if (!wa.wabaId) {
    return NextResponse.json({
      error: "WhatsApp account is missing WABA ID. Please reconnect in Settings and ensure you enter the WABA (WhatsApp Business Account) ID.",
      field: "wabaId",
    }, { status: 400 });
  }

  if (!wa.accessToken) {
    return NextResponse.json({
      error: "WhatsApp account is missing the Access Token. Please reconnect in Settings and enter your Meta access token.",
      field: "accessToken",
    }, { status: 400 });
  }

  // Fetch all templates from Meta — paginate if needed
  let allTemplates: MetaTemplate[] = [];
  let nextUrl: string | null = `https://graph.facebook.com/v21.0/${wa.wabaId}/message_templates?limit=100`;

  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: getMetaHeaders(wa.accessToken) });
    const data = await res.json() as {
      data?: MetaTemplate[];
      paging?: { next?: string };
      error?: { message?: string; code?: number; error_subcode?: number; type?: string; fbtrace_id?: string };
    };

    if (!res.ok || data.error) {
      console.error("[Sync] Meta API error:", JSON.stringify(data.error));
      const errCode = data.error?.code;
      const errSubcode = data.error?.error_subcode;
      const rawMessage = data.error?.message ?? "Failed to fetch from Meta";
      const friendlyMessage = errCode === 190 || errCode === 102 || errSubcode === 460 || errSubcode === 467
        ? "Meta rejected the WhatsApp connection. Please reconnect WhatsApp and ensure the app has the required WhatsApp Business permissions."
        : rawMessage;
      return NextResponse.json({
        error: friendlyMessage,
        code: errCode,
        subcode: errSubcode,
        type: data.error?.type ?? null,
        fbtrace_id: data.error?.fbtrace_id ?? null,
      }, { status: 400 });
    }

    allTemplates = allTemplates.concat(data.data ?? []);
    nextUrl = data.paging?.next ?? null;
  }

  // Upsert each template into DB
  let synced = 0;
  for (const t of allTemplates) {
    const components = t.components ?? [];
    const headerComp = extractComponent(components, "HEADER");
    const bodyComp = extractComponent(components, "BODY");
    const footerComp = extractComponent(components, "FOOTER");
    const buttonsComp = extractComponent(components, "BUTTONS");

    const buttons: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
      buttonsComp?.buttons?.map((b) => ({
        type: b.type,
        text: b.text,
        url: b.url,
        phone_number: b.phone_number,
        example: b.example,
        flow_id: b.flow_id,
        flow_name: b.flow_name,
      })) ?? Prisma.DbNull;

    const headerUrl = headerComp?.format === "TEXT"
      ? (headerComp?.text ?? null)
      : (headerComp?.example?.header_url?.[0] ?? headerComp?.example?.header_handle?.[0] ?? null);

    const isExpiringUrl = (u: string | null) => !!u && u.includes("scontent.whatsapp.net");
    // For update: use headerUrl only if it's a permanent URL (cloudinary etc)
    // If current DB header is an expired scontent URL, clear it to null
    const existing = await prisma.template.findUnique({
      where: { workspaceId_name_language: { workspaceId: membership.workspaceId, name: t.name, language: t.language } },
      select: { header: true },
    });
    const currentHeader = existing?.header ?? null;
    const headerForUpdate = isExpiringUrl(currentHeader)
      ? null  // clear expired scontent URL
      : (headerUrl && !isExpiringUrl(headerUrl) ? headerUrl : undefined); // undefined = don't touch

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
        // Never overwrite a permanent (Cloudinary) URL with an expiring scontent URL
        ...(headerForUpdate !== undefined ? { header: headerForUpdate } : {}),
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
        header: headerUrl,
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
