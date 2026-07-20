import { prisma } from "./src/lib/prisma";

async function debug() {
  const agents = await prisma.aiAgent.findMany({
    select: { id: true, workspaceId: true, autoReply: true, model: true, name: true },
  });
  console.log("=== AI Agents ===");
  console.log(JSON.stringify(agents, null, 2));

  const accounts = await prisma.whatsAppAccount.findMany({
    select: { workspaceId: true, phoneNumberId: true, status: true },
  });
  console.log("=== WhatsApp Accounts ===");
  console.log(JSON.stringify(accounts, null, 2));

  await prisma.$disconnect();
}

debug().catch(console.error);
