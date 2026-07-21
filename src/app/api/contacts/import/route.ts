import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId, normalizePhone } from "@/lib/apiHelpers";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { contacts } = await req.json();
  if (!Array.isArray(contacts) || contacts.length === 0)
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    if (!c.phone) { skipped++; continue; }
    try {
      const phone = normalizePhone(String(c.phone));
      await prisma.contact.upsert({
        where: { workspaceId_phone: { workspaceId, phone } },
        update: {
          ...(c.name ? { name: String(c.name) } : {}),
          ...(c.email ? { email: String(c.email) } : {}),
          ...(Array.isArray(c.tags) && c.tags.length > 0 ? { tags: c.tags.map(String) } : {}),
        },
        create: {
          workspaceId,
          phone,
          name: c.name ? String(c.name) : "Unknown",
          email: c.email ? String(c.email) : null,
          tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
        },
      });
      imported++;
    } catch {
      errors.push(String(c.phone));
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
