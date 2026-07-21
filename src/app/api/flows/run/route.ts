import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type FlowNodeLike = {
  id: string;
  type: string;
  config?: unknown | null;
};

type FlowEdgeLike = {
  source: string;
  sourceHandle?: string | null;
  target?: string | null;
};

function cfg(node: FlowNodeLike): Record<string, unknown> {
  return node.config && typeof node.config === "object" && !Array.isArray(node.config)
    ? (node.config as Record<string, unknown>)
    : {};
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTextMessage(phoneNumberId: string, accessToken: string, to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text, preview_url: false } }),
  });
  return res.ok;
}

async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language: string
) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name: templateName, language: { code: language } },
    }),
  });
  return res.ok;
}

// POST /api/flows/run
// Body: { workspaceId, phone, message, buttonPayload? }
// buttonPayload is set when the incoming message is a template button reply
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const workspaceId   = typeof body.workspaceId === "string" ? body.workspaceId : "";
  const phone         = typeof body.phone === "string" ? body.phone : "";
  const message       = typeof body.message === "string" ? body.message : "";
  const buttonPayload = typeof body.buttonPayload === "string" ? body.buttonPayload : "";

  if (!workspaceId || !phone || (!message && !buttonPayload)) {
    return NextResponse.json({ error: "workspaceId, phone and message/buttonPayload required" }, { status: 400 });
  }

  const [flows, waAccount] = await Promise.all([
    prisma.flow.findMany({
      where: { workspaceId, status: "active" },
      include: { nodes: true, edges: true },
    }),
    prisma.whatsAppAccount.findUnique({ where: { workspaceId } }),
  ]);

  if (!waAccount) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  const { phoneNumberId, accessToken } = waAccount;
  const normalizedMessage = message.toLowerCase();
  // For button replies, match against button text (e.g. "Yes", "Not interested")
  const normalizedButton  = buttonPayload.toLowerCase() || normalizedMessage;

  for (const flow of flows) {
    const trigger = flow.nodes.find((n: FlowNodeLike) => n.type === "trigger");
    if (!trigger) continue;

    const triggerCfg   = cfg(trigger);
    const triggerEvent = typeof triggerCfg.event === "string" ? triggerCfg.event : "message";
    const keyword      = typeof triggerCfg.keyword === "string" ? triggerCfg.keyword.toLowerCase() : "";

    // If trigger is set to "button_reply", only match button messages
    if (triggerEvent === "button_reply" && !buttonPayload) continue;
    // If trigger is set to "message" with a keyword, match keyword in text
    if (triggerEvent === "message" && keyword && !normalizedMessage.includes(keyword)) continue;

    const executed = new Set<string>();
    let currentNodeId: string | null = trigger.id;

    while (currentNodeId) {
      if (executed.has(currentNodeId)) break;
      executed.add(currentNodeId);

      const node = flow.nodes.find((n: FlowNodeLike) => n.id === currentNodeId);
      if (!node) break;

      const nodeCfg = cfg(node);

      // ── CONDITION ──────────────────────────────────────────────────────────
      if (node.type === "condition") {
        const condType  = typeof nodeCfg.conditionType === "string" ? nodeCfg.conditionType : "contains";
        const value     = typeof nodeCfg.value === "string" ? nodeCfg.value : "";
        const matchType = typeof nodeCfg.matchType === "string" ? nodeCfg.matchType : "any";
        const caseSens  = nodeCfg.caseSensitive === true;

        const words = value.split(",").map((w) => w.trim()).filter(Boolean);

        let matched = false;

        if (condType === "button_reply") {
          // Match against button text or payload (case-insensitive by default)
          const haystack = caseSens ? normalizedButton : normalizedButton;
          const check = (w: string) => haystack.includes(caseSens ? w : w.toLowerCase());
          matched = matchType === "all" ? words.every(check) : words.some(check);
        } else if (condType === "contains") {
          const haystack = caseSens ? message : normalizedMessage;
          const check = (w: string) => haystack.includes(caseSens ? w : w.toLowerCase());
          matched = matchType === "all" ? words.every(check) : words.some(check);
        } else if (condType === "tag") {
          const contact = await prisma.contact.findUnique({
            where: { workspaceId_phone: { workspaceId, phone } },
          });
          const check = (w: string) => contact?.tags?.includes(w) ?? false;
          matched = matchType === "all" ? words.every(check) : words.some(check);
        }

        // Pick yes/no edge based on match result
        const edge =
          flow.edges.find(
            (e: FlowEdgeLike) => e.source === currentNodeId && e.sourceHandle === (matched ? "yes" : "no")
          ) ?? flow.edges.find((e: FlowEdgeLike) => e.source === currentNodeId);

        currentNodeId = edge?.target ?? null;
        continue;
      }

      // ── WAIT ───────────────────────────────────────────────────────────────
      if (node.type === "wait") {
        const duration = Number(nodeCfg.duration) || 0;
        const unit     = typeof nodeCfg.unit === "string" ? nodeCfg.unit : "seconds";
        const msMap: Record<string, number> = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 };
        const ms = duration * (msMap[unit] ?? 1000);
        if (ms > 0 && ms <= 30000) await sleep(ms);
      }

      // ── SEND MESSAGE ───────────────────────────────────────────────────────
      if (node.type === "message") {
        const text        = typeof nodeCfg.message === "string" ? nodeCfg.message : "";
        const typingDelay = Number(nodeCfg.typingDelay) || 0;
        if (text) {
          if (typingDelay > 0) await sleep(typingDelay * 1000);
          await sendTextMessage(phoneNumberId, accessToken, phone, text);
        }
      }

      // ── SEND TEMPLATE ──────────────────────────────────────────────────────
      if (node.type === "template") {
        const templateName     = typeof nodeCfg.templateName === "string" ? nodeCfg.templateName : "";
        const templateLanguage = typeof nodeCfg.templateLanguage === "string" ? nodeCfg.templateLanguage : "en";
        const typingDelay      = Number(nodeCfg.typingDelay) || 0;
        if (templateName) {
          if (typingDelay > 0) await sleep(typingDelay * 1000);
          await sendTemplateMessage(phoneNumberId, accessToken, phone, templateName, templateLanguage);
        }
      }

      // ── BUTTON ROUTER ──────────────────────────────────────────────────────
      if (node.type === "buttonRouter") {
        const buttons: string[] = Array.isArray(nodeCfg.templateButtons)
          ? (nodeCfg.templateButtons as string[])
          : [];
        // Find which button index matches the incoming button reply
        const matchedIndex = buttons.findIndex(
          (btn) => btn.toLowerCase() === normalizedButton
        );
        // Pick edge with sourceHandle "btn-{index}", fallback to first edge
        const edge =
          matchedIndex >= 0
            ? flow.edges.find(
                (e: FlowEdgeLike) =>
                  e.source === currentNodeId && e.sourceHandle === `btn-${matchedIndex}`
              )
            : undefined;
        currentNodeId = edge?.target ?? null;
        continue;
      }

      // ── NEXT NODE ──────────────────────────────────────────────────────────
      const nextEdge = flow.edges.find((e: FlowEdgeLike) => e.source === currentNodeId);
      currentNodeId = nextEdge?.target ?? null;
    }

    return NextResponse.json({ matched: true, flowId: flow.id, flowName: flow.name, phone });
  }

  return NextResponse.json({ matched: false });
}
