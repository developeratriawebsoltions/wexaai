import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, getWorkspaceId } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "2025-07"

  const where: Record<string, unknown> = { workspaceId };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { contact: { select: { id: true, name: true, phone: true } } },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await getWorkspaceId(user.id);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { contactId, title, date, duration, notes } = await req.json();
  if (!contactId || !date) return NextResponse.json({ error: "contactId and date required" }, { status: 400 });

  const contact = await prisma.contact.findFirst({ where: { id: contactId, workspaceId } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const booking = await prisma.booking.create({
    data: {
      workspaceId,
      contactId,
      title: title || "Meeting",
      date: new Date(date),
      duration: duration || 30,
      notes: notes || null,
    },
    include: { contact: { select: { id: true, name: true, phone: true } } },
  });

  // Update contact stage to "demo" if currently qualified
  const cf = (contact.customFields && typeof contact.customFields === "object")
    ? contact.customFields as Record<string, unknown>
    : {};
  if (cf.stage === "qualified") {
    await prisma.contact.update({
      where: { id: contactId },
      data: { customFields: { ...cf, stage: "demo", bookedAt: new Date().toISOString() } },
    });
  }

  return NextResponse.json(booking, { status: 201 });
}
