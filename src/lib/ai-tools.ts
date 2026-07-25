import { prisma } from "@/lib/prisma";

export type ToolName =
  | "search_knowledge"
  | "qualify_lead"
  | "assign_human"
  | "get_contact_info";

export interface ToolResult {
  success: boolean;
  data?: string;
}

// ── Tool: Search KnowledgeBase ────────────────────────────────────────────────
export async function searchKnowledge(
  workspaceId: string,
  query: string
): Promise<ToolResult> {
  const knowledge = await prisma.knowledgeBase.findMany({
    where: { workspaceId },
    select: { title: true, content: true },
  });

  if (!knowledge.length) return { success: false, data: "" };

  const q = query.toLowerCase();
  const matched = knowledge.filter(
    (k) =>
      k.title.toLowerCase().includes(q) ||
      k.content.toLowerCase().includes(q)
  );

  const results = (matched.length ? matched : knowledge.slice(0, 3))
    .map((k) => `${k.title}: ${k.content}`)
    .join("\n\n");

  return { success: true, data: results };
}

// ── Tool: Qualify Lead ────────────────────────────────────────────────────────
export async function qualifyLead(
  workspaceId: string,
  phone: string,
  intent: string,
  score: number
): Promise<ToolResult> {
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_phone: { workspaceId, phone } },
  });
  if (!contact) return { success: false, data: "Contact not found" };

  const existingFields =
    contact.customFields && typeof contact.customFields === "object"
      ? (contact.customFields as Record<string, unknown>)
      : {};

  const newTags = contact.tags.includes("lead")
    ? contact.tags
    : [...contact.tags, "lead"];

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: newTags,
      customFields: {
        ...existingFields,
        stage: score >= 7 ? "qualified" : "contacted",
        intent,
        leadScore: score,
        qualifiedAt: new Date().toISOString(),
      },
    },
  });

  // Update conversation status
  await prisma.conversation.updateMany({
    where: { workspaceId, contactPhone: phone },
    data: { status: score >= 7 ? "lead_qualified" : "open" },
  });

  return {
    success: true,
    data: score >= 7 ? "Lead qualified successfully" : "Lead contacted",
  };
}

// ── Tool: Assign to Human ─────────────────────────────────────────────────────
export async function assignHuman(
  workspaceId: string,
  phone: string,
  reason: string
): Promise<ToolResult> {
  await prisma.conversation.updateMany({
    where: { workspaceId, contactPhone: phone },
    data: { status: "needs_attention" },
  });

  return {
    success: true,
    data: `Conversation escalated to human agent. Reason: ${reason}`,
  };
}

// ── Tool: Get Contact Info ────────────────────────────────────────────────────
export async function getContactInfo(
  workspaceId: string,
  phone: string
): Promise<ToolResult> {
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_phone: { workspaceId, phone } },
    select: { name: true, tags: true, customFields: true, createdAt: true },
  });

  if (!contact) return { success: false, data: "New contact" };

  const fields = contact.customFields as Record<string, unknown> | null;
  const stage = fields?.stage ?? "new";
  const info = `Name: ${contact.name}, Tags: ${contact.tags.join(", ") || "none"}, Stage: ${stage}, Customer since: ${contact.createdAt.toDateString()}`;

  return { success: true, data: info };
}

// ── Tool Definitions for Groq Function Calling ────────────────────────────────
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description:
        "Search the knowledge base to answer FAQs, product questions, support queries, pricing, features, or any general information.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "qualify_lead",
      description:
        "Mark a contact as a lead when they show buying intent: asking about pricing, demo, trial, purchase, or specific product features.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            description: "Detected intent e.g. pricing_inquiry, demo_request",
          },
          score: {
            type: "number",
            description: "Lead score 1-10 based on buying intent strength",
          },
        },
        required: ["intent", "score"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_human",
      description:
        "Escalate to a human agent when: user is frustrated, issue is complex, user explicitly asks for human, or AI cannot resolve.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for escalation",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_contact_info",
      description:
        "Get existing contact information to personalize the response for returning customers.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];
