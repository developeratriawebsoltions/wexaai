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

function normalizeToPhone(phone: string) {
  return phone.replace(/^\+/, "");
}

async function sendTextMessage(phoneNumberId: string, accessToken: string, to: string, text: string) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: normalizeToPhone(to), type: "text", text: { body: text, preview_url: false } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Flow] sendTextMessage failed:", JSON.stringify(err));
  }
  return res.ok;
}

async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language: string
) {
  const langCode = language;
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizeToPhone(to),
      type: "template",
      template: { name: templateName, language: { code: langCode } },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Flow] sendTemplateMessage failed:", JSON.stringify(err));
  }
  return res.ok;
}

export async function runFlow(params: {
  workspaceId: string;
  phone: string;
  message: string;
  buttonPayload?: string;
}): Promise<{ matched: boolean; flowId?: string; flowName?: string }> {
  const { workspaceId, phone, message, buttonPayload = "" } = params;

  const [flows, waAccount] = await Promise.all([
    prisma.flow.findMany({
      where: { workspaceId, status: "active" },
      include: { nodes: true, edges: true },
    }),
    prisma.whatsAppAccount.findUnique({ where: { workspaceId } }),
  ]);

  if (!waAccount) return { matched: false };

  const { phoneNumberId, accessToken } = waAccount;
  const normalizedMessage = message.toLowerCase();
  const normalizedButton  = buttonPayload.toLowerCase() || normalizedMessage;

  for (const flow of flows) {
    const trigger = flow.nodes.find((n: FlowNodeLike) => n.type === "trigger");
    if (!trigger) continue;

    const triggerCfg   = cfg(trigger);
    const triggerEvent = typeof triggerCfg.event === "string" ? triggerCfg.event : "message";
    const keyword      = typeof triggerCfg.keyword === "string" ? triggerCfg.keyword.toLowerCase() : "";

    if (triggerEvent === "button_reply" && !buttonPayload) continue;
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
        const words     = value.split(",").map((w) => w.trim()).filter(Boolean);
        let matched     = false;

        if (condType === "button_reply") {
          const check = (w: string) => normalizedButton.includes(caseSens ? w : w.toLowerCase());
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
        const matchedIndex = buttons.findIndex((btn) => btn.toLowerCase() === normalizedButton);
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

    return { matched: true, flowId: flow.id, flowName: flow.name };
  }

  return { matched: false };
}
