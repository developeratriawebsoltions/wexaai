import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const flows = await prisma.flow.findMany({
  include: { nodes: true, edges: true },
  take: 3,
  orderBy: { createdAt: "desc" },
});
console.log(JSON.stringify(flows, null, 2));
await prisma.$disconnect();
