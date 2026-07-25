import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const OWNER_ONLY = [
  "/dashboard/settings",
  "/dashboard/billing",
  "/dashboard/integrations",
];

const MANAGER_AND_ABOVE = [
  "/dashboard/overview",
  "/dashboard/broadcasts",
  "/dashboard/templates",
  "/dashboard/ai-agent",
  "/dashboard/flows",
  "/dashboard/team",
  "/dashboard/analytics",
];

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; email: string; role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // Already logged in — redirect away from login/signup
  if (pathname === "/login" || pathname === "/signup") {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) return NextResponse.redirect(new URL("/dashboard/inbox", req.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.redirect(new URL("/login", req.url));

  const role = payload.role ?? "agent";

  if (OWNER_ONLY.some((p) => pathname.startsWith(p)) && role !== "owner") {
    return NextResponse.redirect(new URL("/dashboard/inbox", req.url));
  }

  if (MANAGER_AND_ABOVE.some((p) => pathname.startsWith(p)) && role === "agent") {
    return NextResponse.redirect(new URL("/dashboard/inbox", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
