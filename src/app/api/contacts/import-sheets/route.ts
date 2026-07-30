import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId, normalizePhone } from "@/lib/apiHelpers";
import { fetchGoogleSheetContacts } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { sheetUrl } = await req.json();
  if (!sheetUrl) return NextResponse.json({ error: "sheetUrl is required" }, { status: 400 });

  let contacts;
  try {
    contacts = await fetchGoogleSheetContacts(sheetUrl);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (contacts.length === 0)
    return NextResponse.json({ error: "No valid contacts found in sheet. Make sure there is a 'phone' column." }, { status: 400 });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const c of contacts) {
    try {
      const phone = normalizePhone(String(c.phone));
      await prisma.contact.upsert({
        where: { workspaceId_phone: { workspaceId, phone } },
        update: {
          ...(c.name ? { name: String(c.name) } : {}),
          ...(c.email ? { email: String(c.email) } : {}),
          ...(c.tags.length > 0 ? { tags: JSON.stringify(c.tags) } : {}),
        },
        create: {
          workspaceId,
          phone,
          name: c.name || "Unknown",
          email: c.email || null,
          tags: JSON.stringify(c.tags),
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
