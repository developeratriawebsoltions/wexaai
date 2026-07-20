import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId, normalizePhone } from "@/lib/apiHelpers";

// GET /api/contacts?search=&tag=&page=1&limit=20
export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const tag = searchParams.get("tag") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = {
    workspaceId,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: { id: true, name: true, phone: true, email: true, tags: true, createdAt: true },
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, limit });
}

// POST /api/contacts
export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { name, phone, email, tags } = await req.json();
  if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });

  const normalizedPhone = normalizePhone(phone);

  const existing = await prisma.contact.findUnique({
    where: { workspaceId_phone: { workspaceId, phone: normalizedPhone } },
  });
  if (existing) return NextResponse.json({ error: "Contact with this phone already exists" }, { status: 409 });

  const contact = await prisma.contact.create({
    data: { workspaceId, name: name || "Unknown", phone: normalizedPhone, email, tags: tags ?? [] },
  });

  return NextResponse.json(contact, { status: 201 });
}
