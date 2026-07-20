import OpenAI from "openai";
import { prisma } from "./prisma";

// Prefer GROQ (Grok) if available, otherwise fall back to OpenAI
const useGroq = Boolean(process.env.GROQ_API_KEY);
const openai = new OpenAI({
  apiKey: useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
  baseURL: useGroq ? "https://api.groq.com/openai/v1" : undefined,
});

export async function handleAiReply(
  workspaceId: string,
  conversationId: string,
  contactPhone: string,
  customerMessage: string
) {
  try {
    const agent = await prisma.aiAgent.findUnique({ where: { workspaceId } });
    console.log("[AI Reply] agent found:", !!agent, "autoReply:", agent?.autoReply);
    if (!agent || !agent.autoReply) return;

    const knowledge = await prisma.knowledgeBase.findMany({
      where: { workspaceId },
      select: { title: true, content: true },
    });

    const knowledgeText = knowledge.map((k) => `${k.title}: ${k.content}`).join("\n");
    const systemPrompt = `${agent.systemPrompt}\n\nKnowledge Base:\n${knowledgeText}`;

    console.log("[AI Reply] provider:", useGroq ? "grok (groq)" : "openai", "requested model:", agent.model);

    // Map incompatible model names to a grok-compatible model when using Groq
    let modelToUse = agent.model ?? (useGroq ? "grok-1" : "gpt-4o-mini");
    if (useGroq) {
      // If UI stored an OpenAI/other model name, default to grok-1 for Groq provider
      if (/gpt|llama|mixtral|gemma|gpt-4/i.test(String(modelToUse))) {
        modelToUse = "grok-1";
      }
    }

    console.log("[AI Reply] calling model:", modelToUse);

    let completion: any;
    if (useGroq) {
      // Call Groq REST endpoint directly to ensure Grok is used
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelToUse,
          temperature: agent.temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: customerMessage },
          ],
        }),
      });

      try {
        completion = await groqRes.json();
      } catch (e) {
        console.error("[AI Reply] failed to parse Groq response", e);
        completion = {};
      }
      if (!groqRes.ok) console.error("[AI Reply] Groq API error", groqRes.status, completion);
    } else {
      completion = await openai.chat.completions.create({
        model: modelToUse,
        temperature: agent.temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: customerMessage },
        ],
      });
    }

    const aiText = completion?.choices?.[0]?.message?.content ?? "";
    console.log("[AI Reply] got response (truncated):", aiText ? aiText.slice(0, 80) : "<empty>");

    if (!aiText) {
      console.error("[AI Reply] completion object:", JSON.stringify(completion));
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "needs_attention" },
      });
      return;
    }

    const account = await prisma.whatsAppAccount.findUnique({ where: { workspaceId } });
    if (!account) { console.error("[AI Reply] No WhatsApp account found"); return; }

    // Send via Meta Cloud API first
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${account.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: contactPhone,
          type: "text",
          text: { body: aiText },
        }),
      }
    );

    const metaData = await metaRes.json();
    console.log("[AI Reply] Meta send status:", metaRes.status, JSON.stringify(metaData));

    // Save AI reply message to DB
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
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
    console.error("[AI Reply] Error:", err);
  }
}
