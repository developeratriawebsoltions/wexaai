require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaNeon } = require('@prisma/adapter-neon');

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check template
  const template = await prisma.template.findFirst({
    where: { name: 'dubai_diwali_package' }
  });
  console.log('\n=== TEMPLATE dubai_diwali_package ===');
  console.log(JSON.stringify(template, null, 2));

  // Check all active flows
  const flows = await prisma.flow.findMany({
    where: { status: 'active' },
    include: { nodes: true, edges: true }
  });
  console.log('\n=== ACTIVE FLOWS:', flows.length, '===');

  for (const flow of flows) {
    console.log('\n--- FLOW:', flow.name, '| id:', flow.id, '---');
    for (const n of flow.nodes) {
      console.log('  NODE type=' + n.type + ' id=' + n.id);
      console.log('       config=' + JSON.stringify(n.config));
    }
    for (const e of flow.edges) {
      console.log('  EDGE src=' + e.source + ' -> tgt=' + e.target + ' handle=' + e.sourceHandle);
    }
  }

  // Simulate button reply matching for "Yes"
  const buttonPayload = 'Yes';
  console.log('\n=== SIMULATING button reply: "' + buttonPayload + '" ===');

  for (const flow of flows) {
    const hasButtonRouter = flow.nodes.some(n => n.type === 'buttonRouter');
    if (!hasButtonRouter) { console.log('Flow "' + flow.name + '" - no buttonRouter, skip'); continue; }

    const routerNode = flow.nodes.find(n => n.type === 'buttonRouter');
    const cfg = routerNode.config || {};
    const buttons = Array.isArray(cfg.templateButtons) ? cfg.templateButtons : [];
    const btnLower = buttonPayload.toLowerCase().trim();
    const matchedIndex = buttons.findIndex(btn =>
      btn.toLowerCase().trim() === btnLower ||
      btnLower.includes(btn.toLowerCase().trim()) ||
      btn.toLowerCase().trim().includes(btnLower)
    );

    console.log('\nFlow "' + flow.name + '"');
    console.log('  buttonRouter node id:', routerNode.id);
    console.log('  templateButtons:', JSON.stringify(buttons));
    console.log('  matchedIndex for "' + buttonPayload + '":', matchedIndex);

    const allEdgesFromRouter = flow.edges.filter(e => e.source === routerNode.id);
    console.log('  ALL edges from buttonRouter:', JSON.stringify(allEdgesFromRouter));

    if (matchedIndex >= 0) {
      const expectedHandle = 'btn-' + matchedIndex;
      const edge = flow.edges.find(e => e.source === routerNode.id && e.sourceHandle === expectedHandle);
      console.log('  Edge for "' + expectedHandle + '":', JSON.stringify(edge || 'NOT FOUND - THIS IS THE BUG'));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
