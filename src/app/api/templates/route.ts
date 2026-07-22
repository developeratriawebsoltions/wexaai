import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";

async function getWorkspaceAndWA(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    select: { workspaceId: true },
  });
  if (!membership) return null;

  const wa = await prisma.whatsAppAccount.findUnique({
    where: { workspaceId: membership.workspaceId },
  });

  return { workspaceId: membership.workspaceId, wa };
}

// GET /api/templates?status=APPROVED&search=welcome
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getWorkspaceAndWA(user.id);
  if (!ctx) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category");

  const templates = await prisma.template.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { body: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

// POST /api/templates — create on Meta then save to DB
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await getWorkspaceAndWA(user.id);
  if (!ctx) return NextResponse.json({ error: "No workspace" }, { status: 404 });
  if (!ctx.wa || ctx.wa.status !== "active") {
    return NextResponse.json({ error: "WhatsApp not connected. Please connect WhatsApp first." }, { status: 400 });
  }

  const { name, category, language, header, headerType, body, footer, buttons } = await req.json();

  if (!name || !category || !body) {
    return NextResponse.json({ error: "name, category and body are required" }, { status: 400 });
  }

  type MetaComponent = { type: string; format?: string; text?: string; example?: { header_url?: string[]; body_text?: string[][] }; buttons?: unknown[] };
  // Build Meta API components array
  const components: MetaComponent[] = [];

  if (headerType) {
    const isMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
    if (isMedia) {
      if (!header) {
        // Media header without sample URL — skip header component entirely
        // Meta requires example.header_url, so we cannot create media header without a sample
        return NextResponse.json(
          { error: `Please provide a sample ${headerType} URL for the header. Meta requires a sample image/video/document URL when creating media header templates.` },
          { status: 400 }
        );
      }
      components.push({
        type: "HEADER",
        format: headerType,
        example: { header_url: [header] },
      });
    } else {
      // TEXT header
      components.push({
        type: "HEADER",
        format: "TEXT",
        ...(header ? { text: header } : {}),
      });
    }
  }

  components.push({ type: "BODY", text: body,
    // Meta requires body example when header has example
    ...(headerType && ["IMAGE","VIDEO","DOCUMENT"].includes(headerType) && header
      ? { example: { body_text: [[]] } }
      : {}),
  });

  if (footer) {
    components.push({ type: "FOOTER", text: footer });
  }

  type ButtonInput = { type: string; text: string; url?: string; phone_number?: string };
  if (buttons?.length) {
    components.push({
      type: "BUTTONS",
      buttons: buttons.map((b: ButtonInput) => {
        if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
        return { type: "QUICK_REPLY", text: b.text };
      }),
    });
  }

  // Submit to Meta
  const metaBody = {
    name: name.toLowerCase().replace(/\s+/g, "_"),
    category: category.toUpperCase(),
    language,
    components,
  };
  console.log("[Template Create] payload:", JSON.stringify(metaBody, null, 2));
  const metaRes = await fetch(
    `https://graph.facebook.com/v21.0/${ctx.wa.wabaId}/message_templates`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.wa.accessToken}`,
      },
      body: JSON.stringify(metaBody),
    }
  );

  const metaData = await metaRes.json();

  if (!metaRes.ok || metaData.error) {
    console.error("[Template Create] Meta error:", JSON.stringify(metaData, null, 2));
    return NextResponse.json(
      { error: metaData.error?.message ?? "Meta API error" },
      { status: 400 }
    );
  }

  // Save to DB — Meta returns id and status
  const template = await prisma.template.create({
    data: {
      workspaceId: ctx.workspaceId,
      metaTemplateId: metaData.id,
      name: name.toLowerCase().replace(/\s+/g, "_"),
      category: category.toUpperCase(),
      language,
      header: header ?? null,
      headerType: headerType ?? null,
      body,
      footer: footer ?? null,
      buttons: buttons ? buttons as Prisma.InputJsonValue : Prisma.JsonNull,
      status: metaData.status ?? "PENDING",
    },
  });

  return NextResponse.json(template, { status: 201 });
}
