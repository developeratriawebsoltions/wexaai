import { prisma } from "@/lib/prisma";
import { normalizeTags, serializeTags } from "@/lib/contactTags";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Qualification questions sequence
const QUALIFICATION_QUESTIONS = [
  { key: "need", question: "Great! To help you better, what are you mainly looking for? (e.g. automation, support, marketing)" },
  { key: "budget", question: "What's your approximate budget range for this? (e.g. under $100/mo, $100-500/mo, $500+/mo)" },
  { key: "timeline", question: "When are you looking to get started? (e.g. immediately, within a month, just exploring)" },
  { key: "authority", question: "Are you the decision maker for this, or will others be involved?" },
];

export interface QualificationState {
  active: boolean;
  step: number; // 0-3 = which question we're on, 4 = done
  answers: Record<string, string>;
  triggeredBy: string; // the message that triggered qualification
}

async function groqScore(answers: Record<string, string>): Promise<{ score: number; intent: string; summary: string }> {
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a lead scoring expert. Score this lead 1-10 based on their answers.
Return ONLY valid JSON: {"score": number, "intent": "string", "summary": "string"}
- score 8-10: Hot lead (clear need + budget + ready now + decision maker)
- score 5-7: Warm lead (some interest but not urgent)
- score 1-4: Cold lead (just exploring, no budget, not decision maker)
- intent: short label like "pricing_inquiry", "demo_request", "automation_need", "just_exploring"
- summary: one sentence about this lead`,
          },
          {
            role: "user",
            content: `Lead answers:\nNeed: ${answers.need || "not answered"}\nBudget: ${answers.budget || "not answered"}\nTimeline: ${answers.timeline || "not answered"}\nDecision maker: ${answers.authority || "not answered"}`,
          },
        ],
      }),
    });

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[LeadQualifier] groqScore error:", err);
  }
  return { score: 5, intent: "general_inquiry", summary: "Lead qualification completed" };
}

function getQualificationState(customFields: Record<string, unknown> | null): QualificationState | null {
  if (!customFields?.qualificationState) return null;
  return customFields.qualificationState as QualificationState;
}

// Check if message shows buying intent to trigger qualification
async function detectBuyingIntent(message: string): Promise<boolean> {
  const buyingKeywords = [
    "price", "pricing", "cost", "how much", "plan", "subscribe", "buy", "purchase",
    "demo", "trial", "interested", "want to", "need", "looking for", "can you help",
    "features", "package", "offer", "discount", "start", "sign up", "register",
    "قیمت", "خریدنا", "چاہتا", "مدد", "سروس", // Urdu keywords
  ];
  const lower = message.toLowerCase();
  return buyingKeywords.some((kw) => lower.includes(kw));
}

// ── Main qualification handler ────────────────────────────────────────────────
export async function handleLeadQualification(
  workspaceId: string,
  phone: string,
  conversationId: string,
  message: string
): Promise<{ handled: boolean; reply?: string }> {
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_phone: { workspaceId, phone } },
  });
  if (!contact) return { handled: false };

  const customFields = (contact.customFields && typeof contact.customFields === "object")
    ? contact.customFields as Record<string, unknown>
    : {};

  // Already fully qualified — skip
  if (customFields.stage === "qualified" || customFields.stage === "won") {
    return { handled: false };
  }

  const state = getQualificationState(customFields);

  // ── Active qualification in progress ──
  if (state?.active) {
    const currentQuestion = QUALIFICATION_QUESTIONS[state.step];
    if (!currentQuestion) return { handled: false };

    // Save this answer
    const updatedAnswers = { ...state.answers, [currentQuestion.key]: message };
    const nextStep = state.step + 1;

    if (nextStep < QUALIFICATION_QUESTIONS.length) {
      // Ask next question
      const nextQuestion = QUALIFICATION_QUESTIONS[nextStep];
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          customFields: {
            ...customFields,
            qualificationState: {
              active: true,
              step: nextStep,
              answers: updatedAnswers,
              triggeredBy: state.triggeredBy,
            },
          },
        },
      });
      return { handled: true, reply: nextQuestion.question };
    }

    // All questions answered — score the lead
    const { score, intent, summary } = await groqScore(updatedAnswers);
    const stage = score >= 8 ? "qualified" : score >= 5 ? "contacted" : "new";
    const existingTags = normalizeTags(contact.tags);
    const newTags = existingTags.includes("lead") ? existingTags : [...existingTags, "lead"];

    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        tags: serializeTags(newTags),
        customFields: {
          ...customFields,
          stage,
          intent,
          leadScore: score,
          leadSummary: summary,
          qualifiedAt: new Date().toISOString(),
          qualificationAnswers: updatedAnswers,
          qualificationState: null, // clear active state
        },
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: score >= 8 ? "resolved" : "open",
      },
    }).catch(() => {});

    const closingMessage =
      score >= 8
        ? `Thank you! Based on your answers, you look like a great fit. Our team will reach out to you shortly with a personalized offer. 🎉`
        : score >= 5
        ? `Thanks for sharing! We'll follow up with more details soon. Feel free to ask any questions in the meantime.`
        : `Thanks for your interest! We'll keep you updated on our latest offers. Feel free to reach out anytime.`;

    return { handled: true, reply: closingMessage };
  }

  // ── Check if we should START qualification ──
  const alreadyQualified = !!customFields.qualifiedAt;
  if (alreadyQualified) return { handled: false };

  const hasBuyingIntent = await detectBuyingIntent(message);
  if (!hasBuyingIntent) return { handled: false };

  // Start qualification flow
  const firstQuestion = QUALIFICATION_QUESTIONS[0];
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      customFields: {
        ...customFields,
        qualificationState: {
          active: true,
          step: 0,
          answers: {},
          triggeredBy: message,
        },
      },
    },
  });

  return {
    handled: true,
    reply: `Hi! I'd love to help you find the right solution. ${firstQuestion.question}`,
  };
}

// ── Manual trigger: qualify a contact immediately via API ─────────────────────
export async function triggerManualQualification(
  workspaceId: string,
  contactId: string
): Promise<{ success: boolean; message: string }> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, workspaceId },
  });
  if (!contact) return { success: false, message: "Contact not found" };

  const customFields = (contact.customFields && typeof contact.customFields === "object")
    ? contact.customFields as Record<string, unknown>
    : {};

  // Use existing conversation messages as context for scoring
  const conversation = await prisma.conversation.findFirst({
    where: { workspaceId, contactId },
    include: {
      messages: {
        where: { direction: "inbound" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { text: true },
      },
    },
  });

  const messageHistory = conversation?.messages.map((m) => m.text).join(" ") ?? "";

  const { score, intent, summary } = await groqScore({
    need: messageHistory || "No messages yet",
    budget: (customFields.budget as string) ?? "unknown",
    timeline: "unknown",
    authority: "unknown",
  });

  const stage = score >= 8 ? "qualified" : score >= 5 ? "contacted" : "new";
  const existingTags = normalizeTags(contact.tags);
  const newTags = existingTags.includes("lead") ? existingTags : [...existingTags, "lead"];

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      tags: serializeTags(newTags),
      customFields: {
        ...customFields,
        stage,
        intent,
        leadScore: score,
        leadSummary: summary,
        qualifiedAt: new Date().toISOString(),
      },
    },
  });

  if (conversation) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: score >= 8 ? "resolved" : "open" },
    }).catch(() => {});
  }

  return {
    success: true,
    message: `Lead scored ${score}/10 — Stage: ${stage} — Intent: ${intent}`,
  };
}
