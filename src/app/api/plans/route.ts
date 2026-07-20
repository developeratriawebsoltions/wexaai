import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });

  if (plans.length === 0) {
    await prisma.plan.createMany({
      data: [
        { name: "Free", price: 0, contactsLimit: 100, messagesLimit: 500, aiLimit: 100, teamLimit: 1 },
        { name: "Starter", price: 999, contactsLimit: 5000, messagesLimit: 20000, aiLimit: 5000, teamLimit: 3 },
        { name: "Professional", price: 2999, contactsLimit: 25000, messagesLimit: 100000, aiLimit: 25000, teamLimit: 10 },
        { name: "Enterprise", price: 0, contactsLimit: -1, messagesLimit: -1, aiLimit: -1, teamLimit: -1 },
      ],
    });
    plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  }

  return NextResponse.json({ plans });
}
