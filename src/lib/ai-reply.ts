import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
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

    console.log("[AI Reply] calling OpenAI with model:", agent.model);
    const completion = await openai.chat.completions.create({
      model: agent.model,
      temperature: agent.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: customerMessage },
      ],
    });

    const aiText = completion.choices[0]?.message?.content ?? "";
    console.log("[AI Reply] got response:", aiText?.slice(0, 80));

    if (!aiText) {
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
