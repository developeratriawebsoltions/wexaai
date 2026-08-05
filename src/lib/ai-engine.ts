import { prisma } from "@/lib/prisma";
import {
  TOOL_DEFINITIONS,
  ToolName,
  searchKnowledge,
  qualifyLead,
  assignHuman,
  getContactInfo,
} from "@/lib/ai-tools";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function groqCall(payload: object): Promise<Record<string, unknown>> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 429) {
    console.warn("[AI Engine] Groq rate limited");
    return {};
  }

  const data = await res.json();
  if (!res.ok) {
    console.error("[AI Engine] Groq error:", res.status, JSON.stringify(data));
    return {};
  }
  return data as Record<string, unknown>;
}

// ── Execute whichever tool Groq chose ────────────────────────────────────────
async function executeTool(
  toolName: ToolName,
  args: Record<string, unknown>,
  workspaceId: string,
  phone: string
) {
  console.log("[AI Engine] executing tool:", toolName, args);

  switch (toolName) {
    case "search_knowledge":
      return searchKnowledge(workspaceId, String(args.query ?? ""));

    case "qualify_lead":
      return qualifyLead(
        workspaceId,
        phone,
        String(args.intent ?? "general"),
        Number(args.score ?? 5)
      );

    case "assign_human":
      return assignHuman(workspaceId, phone, String(args.reason ?? ""));

    case "get_contact_info":
      return getContactInfo(workspaceId, phone);

    default:
      return { success: false, data: "" };
  }
}

// ── Main AI Engine ────────────────────────────────────────────────────────────
export async function runAiEngine(
  workspaceId: string,
  conversationId: string,
  phone: string,
  userMessage: string
): Promise<void> {
  try {
    // 1. Load agent config
    const agent = await prisma.aiAgent.findUnique({ where: { workspaceId } });
    if (!agent || !agent.autoReply) return;

    const model = /gpt/i.test(agent.model ?? "")
      ? "llama-3.3-70b-versatile"
      : (agent.model ?? "llama-3.3-70b-versatile");

    const systemPrompt = agent.systemPrompt ?? "You are a helpful customer support assistant.";

    // 2. Step 1 — Intent detection + tool selection via Groq function calling
    const step1 = await groqCall({
      model,
      temperature: agent.temperature ?? 0.3,
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const choice = (step1 as { choices?: { message?: { content?: string; tool_calls?: { function: { name: string; arguments: string } }[] } }[] })
      ?.choices?.[0]?.message;

    if (!choice) {
      console.error("[AI Engine] No choice from Groq step1");
      return;
    }

    let toolResultText = "";

    // 3. Step 2 — Run the tool Groq chose
    if (choice.tool_calls?.length) {
      const toolCall = choice.tool_calls[0];
      const toolName = toolCall.function.name as ToolName;
      let args: Record<string, unknown> = {};

      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("[AI Engine] Failed to parse tool args:", toolCall.function.arguments);
      }

      const result = await executeTool(toolName, args, workspaceId, phone);
      toolResultText = result.data ?? "";
      console.log("[AI Engine] tool result:", toolName, result.success, toolResultText?.slice(0, 80));
    }

    // 4. Step 3 — Generate final response with tool result as context
    const finalMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    if (toolResultText) {
      finalMessages.push({
        role: "system",
        content: `Context from knowledge base / CRM:\n${toolResultText}`,
      });
    }

    const step2 = await groqCall({
      model,
      temperature: agent.temperature ?? 0.5,
      messages: finalMessages,
    });

    const aiText =
      (step2 as { choices?: { message?: { content?: string } }[] })
        ?.choices?.[0]?.message?.content ?? "";

    if (!aiText) {
      console.error("[AI Engine] Empty final response");
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "pending" },
      });
      return;
    }

    // 5. Send via WhatsApp
    const account = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
    if (!account) return;

    const toPhone = phone.replace(/^\+/, "");
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${account.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhone,
          type: "text",
          text: { body: aiText },
        }),
      }
    );

    const metaData = await metaRes.json();
    console.log("[AI Engine] WhatsApp send:", metaRes.status, JSON.stringify(metaData));

    // 6. Save AI message to DB
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        contactId: conversation?.contactId ?? null,
        from: "AI",
        text: aiText,
        waMessageId: metaData?.messages?.[0]?.id,
        direction: "outbound",
        status: metaRes.ok ? "sent" : "failed",
        messageType: "text",
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: aiText, lastMessageAt: new Date() },
    });
  } catch (err) {
    console.error("[AI Engine] Error:", err);
  }
}
