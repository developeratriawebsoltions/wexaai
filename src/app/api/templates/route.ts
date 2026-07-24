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
  // Meta WhatsApp template API uses locale codes like "en" or "en_US"
  // Normalize common variants to Meta-accepted codes
  const languageMap: Record<string, string> = {
    en: "en",
    en_US: "en_US",
    en_GB: "en_GB",
    hi: "hi",
    hi_IN: "hi",
    es: "es",
    es_MX: "es_MX",
    es_ES: "es_ES",
    ar: "ar",
    fr: "fr",
    de: "de",
    pt_BR: "pt_BR",
    pt: "pt_PT",
    id: "id",
    it: "it",
    ja: "ja",
    ko: "ko",
    ru: "ru",
    tr: "tr",
    zh_CN: "zh_CN",
    zh_TW: "zh_TW",
  };
  const languageCode = languageMap[language] ?? language;

  if (!name || !category || !body) {
    return NextResponse.json({ error: "name, category and body are required" }, { status: 400 });
  }

  type MetaComponent = { type: string; format?: string; text?: string; example?: { header_url?: string[]; header_handle?: string[]; body_text?: string[][] }; buttons?: unknown[] };
  // Build Meta API components array
  const components: MetaComponent[] = [];

  if (headerType) {
    const isMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType);
    if (isMedia) {
      if (!header) {
        return NextResponse.json(
          { error: `Please upload a sample ${headerType} for the header.` },
          { status: 400 }
        );
      }

      // Download the Cloudinary image and upload it to Meta to get a valid handle
      let metaHandle: string | null = null;
      try {
        const imgRes = await fetch(header);
        if (!imgRes.ok) throw new Error("Failed to fetch image");
        const imgBuffer = await imgRes.arrayBuffer();
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        const fileSize = imgBuffer.byteLength;

        // Step 1: Start upload session with Meta
        const sessionRes = await fetch(`https://graph.facebook.com/v21.0/app/uploads`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ctx.wa.accessToken}` },
          body: JSON.stringify({ file_length: fileSize, file_type: contentType, access_token: ctx.wa.accessToken }),
        });
        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.id) throw new Error(sessionData.error?.message ?? "Failed to start Meta upload session");

        // Step 2: Upload the file bytes to Meta
        const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${sessionData.id}`, {
          method: "POST",
          headers: {
            Authorization: `OAuth ${ctx.wa.accessToken}`,
            "file_offset": "0",
            "Content-Type": contentType,
          },
          body: imgBuffer,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.h) throw new Error(uploadData.error?.message ?? "Failed to upload image to Meta");
        metaHandle = uploadData.h;
      } catch (err: any) {
        console.error("[Template Create] Meta image upload error:", err.message);
        return NextResponse.json({ error: `Image upload to Meta failed: ${err.message}` }, { status: 400 });
      }

      components.push({
        type: "HEADER",
        format: headerType,
        ...(metaHandle ? { example: { header_handle: [metaHandle] } } : {}),
      });
    } else if (header) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: header,
      });
    }
  }

  const bodyVarMatches = [...body.matchAll(/\{\{(\d+)\}\}/g)];
  const bodyVarCount = bodyVarMatches.length
    ? Math.max(...bodyVarMatches.map((m: RegExpMatchArray) => parseInt(m[1])))
    : 0;
  const hasMediaHeader = headerType && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && header;

  const bodyExample = bodyVarCount > 0 ? [Array(bodyVarCount).fill("sample")] : [["sample"]];

  components.push({
    type: "BODY",
    text: body,
    ...(bodyVarCount > 0 || hasMediaHeader ? { example: { body_text: bodyExample } } : {}),
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
    language: languageCode,
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
    const subcode = metaData.error?.error_subcode;
    const userMsg = metaData.error?.error_user_msg;
    const userTitle = metaData.error?.error_user_title;
    let friendlyError = metaData.error?.message ?? "Meta API error";
    if (subcode === 2388024 || userTitle?.includes("already exists")) {
      friendlyError = `A template with this name already exists for the selected language. Please use a different name.`;
    } else if (subcode === 2388049 || userTitle?.includes("not supported")) {
      friendlyError = `Language not supported for your WhatsApp account. Please select a different language.`;
    } else if (userMsg) {
      friendlyError = userMsg;
    }
    return NextResponse.json({ error: friendlyError }, { status: 400 });
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
