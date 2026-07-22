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
  workspaceId: string,
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  language: string,
  headerImageUrl?: string
) {
  const template = await prisma.template.findUnique({
    where: { workspaceId_name_language: { workspaceId, name: templateName, language } },
  });

  console.log("[Flow] DB template found:", JSON.stringify(template));

  const components: { type: string; parameters?: { type: string; text?: string; image?: { link: string }; video?: { link: string }; document?: { link: string } }[] }[] = [];

  if (template?.headerType) {
    const isMedia = ["IMAGE", "VIDEO", "DOCUMENT"].includes(template.headerType);
    if (isMedia) {
      const mediaLink = headerImageUrl || template.header || "";
      if (mediaLink) {
        const mediaKey = template.headerType.toLowerCase() as "image" | "video" | "document";
        components.push({
          type: "header",
          parameters: [{ type: mediaKey, [mediaKey]: { link: mediaLink } }],
        });
      }
    }
  }

  const metaPayload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: normalizeToPhone(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length ? { components } : {}),
    },
  };

  console.log("[Flow] sendTemplateMessage payload:", JSON.stringify(metaPayload));

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(metaPayload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[Flow] sendTemplateMessage failed:", JSON.stringify(err));
  } else {
    console.log("[Flow] sendTemplateMessage success:", templateName);
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

  console.log("[Flow] ===== runFlow called =====");
  console.log("[Flow] params:", { workspaceId, phone, message, buttonPayload });
  console.log("[Flow] totalFlows:", flows.length);

  // ── DUMP ALL FLOWS RAW FOR DEBUGGING ──────────────────────────────────────
  for (const f of flows) {
    console.log(`[Flow] RAW flow "${f.name}" status=${f.status}`);
    for (const n of f.nodes) {
      console.log(`[Flow]   node id=${n.id} type=${n.type} config=${JSON.stringify(n.config)}`);
    }
    for (const e of f.edges) {
      console.log(`[Flow]   edge source=${e.source} target=${e.target} sourceHandle=${e.sourceHandle}`);
    }
  }

  for (const flow of flows) {
    const trigger = flow.nodes.find((n: FlowNodeLike) => n.type === "trigger");
    if (!trigger) { console.log("[Flow] No trigger in flow:", flow.name); continue; }

    const triggerCfg   = cfg(trigger);
    const triggerEvent = typeof triggerCfg.event === "string" ? triggerCfg.event : "message";
    const keyword      = typeof triggerCfg.keyword === "string" ? triggerCfg.keyword.toLowerCase() : "";
    const flowHasButtonRouter = flow.nodes.some((n: FlowNodeLike) => n.type === "buttonRouter");

    console.log(`[Flow] Checking flow="${flow.name}" triggerEvent=${triggerEvent} keyword="${keyword}" flowHasButtonRouter=${flowHasButtonRouter}`);
    console.log(`[Flow]   buttonPayload="${buttonPayload}" message="${message}"`);

    if (triggerEvent === "button_reply" && !buttonPayload) {
      console.log("[Flow] SKIP: button_reply trigger but no buttonPayload");
      continue;
    }

    if (triggerEvent === "message") {
      if (buttonPayload) {
        if (!flowHasButtonRouter) {
          console.log("[Flow] SKIP: button reply but flow has no buttonRouter");
          continue;
        }
        console.log("[Flow] MATCH: button reply + flow has buttonRouter");
      } else {
        if (keyword && !normalizedMessage.includes(keyword)) {
          console.log(`[Flow] SKIP: keyword mismatch keyword="${keyword}" msg="${normalizedMessage}"`);
          continue;
        }
      }
    }

    console.log("[Flow] EXECUTING flow:", flow.name);

    const executed = new Set<string>();
    let currentNodeId: string | null = trigger.id;

    while (currentNodeId) {
      if (executed.has(currentNodeId)) break;
      executed.add(currentNodeId);

      const node = flow.nodes.find((n: FlowNodeLike) => n.id === currentNodeId);
      if (!node) { console.log("[Flow] Node not found id:", currentNodeId); break; }

      console.log(`[Flow] >> node id=${node.id} type=${node.type} config=${JSON.stringify(node.config)}`);

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

        console.log(`[Flow] condition matched=${matched}`);
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
        const nextEdge = flow.edges.find((e: FlowEdgeLike) => e.source === currentNodeId);
        const nextNode = nextEdge?.target
          ? flow.nodes.find((n: FlowNodeLike) => n.id === nextEdge.target)
          : null;
        const isFollowedByButtonRouter = nextNode?.type === "buttonRouter";
        const skipSend = buttonPayload && isFollowedByButtonRouter;

        console.log("[Flow] template node:", {
          templateName: nodeCfg.templateName,
          nextNodeType: nextNode?.type ?? "none",
          isFollowedByButtonRouter,
          skipSend,
        });

        if (!skipSend) {
          const templateName     = typeof nodeCfg.templateName === "string" ? nodeCfg.templateName : "";
          const templateLanguage = typeof nodeCfg.templateLanguage === "string" ? nodeCfg.templateLanguage : "en";
          const headerImageUrl   = typeof nodeCfg.headerImageUrl === "string" ? nodeCfg.headerImageUrl.trim() : "";
          const typingDelay      = Number(nodeCfg.typingDelay) || 0;
          if (templateName) {
            if (typingDelay > 0) await sleep(typingDelay * 1000);
            await sendTemplateMessage(workspaceId, phoneNumberId, accessToken, phone, templateName, templateLanguage, headerImageUrl || undefined);
          } else {
            console.error("[Flow] Template node missing templateName! node id:", node.id, "full config:", JSON.stringify(node.config));
          }
        }
      }

      // ── BUTTON ROUTER ──────────────────────────────────────────────────────
      if (node.type === "buttonRouter") {
        const rawButtons = nodeCfg.templateButtons;
        console.log("[Flow] buttonRouter raw templateButtons:", JSON.stringify(rawButtons));
        const buttons: string[] = Array.isArray(rawButtons)
          ? (rawButtons as string[])
          : [];
        const buttonToMatch = (buttonPayload || message).toLowerCase().trim();
        console.log("[Flow] buttonRouter buttons:", buttons, "buttonToMatch:", buttonToMatch);
        const matchedIndex = buttons.findIndex(
          (btn) =>
            btn.toLowerCase().trim() === buttonToMatch ||
            buttonToMatch.includes(btn.toLowerCase().trim()) ||
            btn.toLowerCase().trim().includes(buttonToMatch)
        );
        console.log("[Flow] buttonRouter matchedIndex:", matchedIndex);
        if (matchedIndex < 0) {
          console.log("[Flow] STOP: buttonRouter no match");
          currentNodeId = null;
          continue;
        }
        const edge = flow.edges.find(
          (e: FlowEdgeLike) =>
            e.source === currentNodeId && e.sourceHandle === `btn-${matchedIndex}`
        );
        console.log("[Flow] buttonRouter edge for btn-" + matchedIndex + ":", JSON.stringify(edge ?? "NONE"));
        // Log ALL edges from this node for debugging
        const allEdgesFromRouter = flow.edges.filter((e: FlowEdgeLike) => e.source === currentNodeId);
        console.log("[Flow] ALL edges from buttonRouter:", JSON.stringify(allEdgesFromRouter));
        currentNodeId = edge?.target ?? null;
        continue;
      }

      // ── NEXT NODE ──────────────────────────────────────────────────────────
      const nextEdge = flow.edges.find((e: FlowEdgeLike) => e.source === currentNodeId);
      console.log("[Flow] next edge:", JSON.stringify(nextEdge ?? "NONE"));
      currentNodeId = nextEdge?.target ?? null;
    }

    return { matched: true, flowId: flow.id, flowName: flow.name };
  }

  return { matched: false };
}
