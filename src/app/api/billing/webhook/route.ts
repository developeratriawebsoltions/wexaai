import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected !== signature) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  const event = JSON.parse(body);
  if (event.event !== "payment.captured") return NextResponse.json({ ok: true });

  const payment = event.payload.payment.entity;
  const { workspaceId, planId } = payment.notes ?? {};
  if (!workspaceId || !planId) return NextResponse.json({ ok: true });

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ ok: true });

  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const subscription = await prisma.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      planId,
      status: "active",
      nextBillingDate,
      paymentGateway: "razorpay",
      gatewaySubscriptionId: payment.id,
    },
    update: {
      planId,
      status: "active",
      nextBillingDate,
      gatewaySubscriptionId: payment.id,
    },
  });

  const invoiceCount = await prisma.invoice.count({ where: { workspaceId } });
  const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

  await Promise.all([
    prisma.invoice.create({
      data: {
        workspaceId,
        subscriptionId: subscription.id,
        invoiceNumber,
        amount: payment.amount / 100,
        status: "paid",
      },
    }),
    prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        gateway: "razorpay",
        gatewayPaymentId: payment.id,
        amount: payment.amount / 100,
        status: "success",
      },
    }),
    prisma.workspace.update({
      where: { id: workspaceId },
      data: { plan: plan.name.toLowerCase() },
    }),
    prisma.usageLog.create({
      data: { workspaceId, contactsUsed: 0, messagesUsed: 0, aiUsed: 0 },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
