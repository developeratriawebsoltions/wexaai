import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/apiHelpers";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const { planId } = await req.json();
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, role: "owner" },
    include: { workspace: true },
  });
  if (!membership) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (plan.price === 0) return NextResponse.json({ error: "Contact sales for Enterprise" }, { status: 400 });

  try {
    const order = await razorpay.orders.create({
      amount: plan.price * 100,
      currency: "INR",
      receipt: `order_${membership.workspaceId}_${Date.now()}`,
      notes: { workspaceId: membership.workspaceId, planId },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planName: plan.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Razorpay order creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
