import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";
import { normalizeTags } from "@/lib/contactTags";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const contacts = await prisma.contact.findMany({
    where: { workspaceId },
    select: { name: true, phone: true, email: true, tags: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const header = "name,phone,email,tags,created_at";
  const rows = contacts.map((c) => {
    const tags = normalizeTags(c.tags).join("|");
    return [
      `"${c.name.replace(/"/g, '""')}"`,
      c.phone,
      c.email ?? "",
      `"${tags}"`,
      c.createdAt.toISOString().split("T")[0],
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="wexa-contacts-${Date.now()}.csv"`,
    },
  });
}
