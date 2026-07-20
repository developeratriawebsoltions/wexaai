import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const { name, email, password, businessName } = await req.json();

  if (!name || !email || !password || !businessName)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await hashPassword(password);

  // Generate unique slug
  const baseSlug = toSlug(businessName);
  const slugExists = await prisma.workspace.findUnique({ where: { slug: baseSlug } });
  const slug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  const workspace = await prisma.workspace.create({
    data: {
      name: businessName,
      slug,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });

  const token = signToken({ id: user.id, email: user.email });

  const res = NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email }, workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug } },
    { status: 201 }
  );

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
