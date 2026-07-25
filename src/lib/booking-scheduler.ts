import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ParsedBooking {
  date: string;       // ISO string
  title: string;
  duration: number;   // minutes
}

interface BookingPendingState {
  active: true;
  parsed: ParsedBooking;
  triggeredBy: string;
}

// ── Groq: detect booking intent + parse date/time ────────────────────────────
async function parseBookingIntent(
  message: string
): Promise<ParsedBooking | null> {
  try {
    const now = new Date().toISOString();
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are a booking assistant. Current datetime: ${now}
Extract booking details from the user message.
Return ONLY valid JSON or null if no booking intent found.
Format: {"date": "ISO_STRING", "title": "string", "duration": number_in_minutes}
- date: convert relative/absolute dates to full ISO datetime (e.g. "26 July 5pm" → "2026-07-26T17:00:00.000Z")
- title: infer from context (e.g. "demo", "meeting", "call", "appointment") default "Meeting"
- duration: default 30
- If NO booking intent (just chatting, asking questions), return null
Examples of booking intent: "book a meeting", "schedule a call", "set appointment", "26 july 5pm book karo", "kal 3 baje meeting", "book kar do"`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content || content === "null") return null;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ParsedBooking;
    if (!parsed.date) return null;
    // Validate date is parseable
    const d = new Date(parsed.date);
    if (isNaN(d.getTime())) return null;
    return { date: d.toISOString(), title: parsed.title || "Meeting", duration: parsed.duration || 30 };
  } catch (err) {
    console.error("[BookingScheduler] parseBookingIntent error:", err);
    return null;
  }
}

function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function getPendingBooking(customFields: Record<string, unknown>): BookingPendingState | null {
  if (!customFields?.pendingBooking) return null;
  return customFields.pendingBooking as BookingPendingState;
}

// ── Conflict check: is the slot already taken? ────────────────────────────────
async function findConflict(
  workspaceId: string,
  date: string,
  duration: number
): Promise<{ conflicting: boolean; alternatives: string[] }> {
  const start = new Date(date);
  const end = new Date(start.getTime() + duration * 60000);

  // Fetch all scheduled bookings on the same day
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const dayBookings = await prisma.booking.findMany({
    where: {
      workspaceId,
      status: { in: ["scheduled"] },
      date: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { date: "asc" },
  });

  // Check overlap: existing [eStart, eEnd] overlaps with [start, end]
  const hasConflict = dayBookings.some((b) => {
    const eStart = new Date(b.date);
    const eEnd = new Date(eStart.getTime() + b.duration * 60000);
    return start < eEnd && end > eStart;
  });

  if (!hasConflict) return { conflicting: false, alternatives: [] };

  // Build list of taken slots for the day
  const takenMinutes = new Set<number>();
  for (const b of dayBookings) {
    const s = new Date(b.date);
    for (let i = 0; i < b.duration; i += 30) {
      takenMinutes.add(s.getHours() * 60 + s.getMinutes() + i);
    }
  }

  // Find up to 3 free 30-min slots between 9am–7pm
  const alternatives: string[] = [];
  for (let mins = 9 * 60; mins <= 19 * 60 && alternatives.length < 3; mins += 30) {
    const slotTaken = Array.from({ length: Math.ceil(duration / 30) }, (_, i) =>
      takenMinutes.has(mins + i * 30)
    ).some(Boolean);
    if (!slotTaken) {
      const alt = new Date(start);
      alt.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
      alternatives.push(alt.toISOString());
    }
  }

  return { conflicting: true, alternatives };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function handleBookingScheduler(
  workspaceId: string,
  phone: string,
  conversationId: string,
  message: string
): Promise<{ handled: boolean; reply?: string }> {
  const contact = await prisma.contact.findUnique({
    where: { workspaceId_phone: { workspaceId, phone } },
  });
  if (!contact) return { handled: false };

  const cf = (contact.customFields && typeof contact.customFields === "object")
    ? contact.customFields as Record<string, unknown>
    : {};

  // ── Step 2: User is confirming/rejecting a pending booking ──
  const pending = getPendingBooking(cf);
  if (pending?.active) {
    const reply = message.trim().toLowerCase();
    const isYes = /^(yes|y|ha|haan|confirm|ok|okay|sure|book it|yes please|yep|yup|ہاں|ہاں جی|جی ہاں|ji|ji han)/.test(reply);
    const isNo  = /^(no|n|nahi|nope|cancel|don't|dont|نہیں|na|nah)/.test(reply);

    if (isYes) {
      // Re-check conflict at confirmation time (someone else may have booked in between)
      const { conflicting, alternatives } = await findConflict(
        workspaceId, pending.parsed.date, pending.parsed.duration
      );

      if (conflicting) {
        const altLines = alternatives.length
          ? `\n\nAvailable slots:\n${alternatives.map((a, i) => `${i + 1}. ${formatBookingDate(a)}`).join("\n")}`
          : "";
        // Clear pending so user can re-request
        await prisma.contact.update({
          where: { id: contact.id },
          data: { customFields: { ...(cf as Prisma.JsonObject), pendingBooking: null } },
        });
        return {
          handled: true,
          reply: `❌ Sorry! *${formatBookingDate(pending.parsed.date)}* is no longer available — someone just booked it.${altLines}\n\nPlease send a new time to book.`,
        };
      }

      // No conflict — create the booking
      await prisma.booking.create({
        data: {
          workspaceId,
          contactId: contact.id,
          title: pending.parsed.title,
          date: new Date(pending.parsed.date),
          duration: pending.parsed.duration,
          notes: `Booked via WhatsApp by ${contact.name}`,
        },
      });

      // Update contact stage to "demo" if qualified
      const newCf: Prisma.JsonObject = { ...cf as Prisma.JsonObject, pendingBooking: null };
      if ((cf as Prisma.JsonObject).stage === "qualified") newCf.stage = "demo";
      await prisma.contact.update({
        where: { id: contact.id },
        data: { customFields: newCf },
      });

      return {
        handled: true,
        reply: `✅ *Booking Confirmed!*\n\n📅 *${pending.parsed.title}*\n🕐 ${formatBookingDate(pending.parsed.date)}\n⏱ Duration: ${pending.parsed.duration} minutes\n\nWe'll see you then! If you need to reschedule, just let us know.`,
      };
    }

    if (isNo) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { customFields: { ...(cf as Prisma.JsonObject), pendingBooking: null } },
      });
      return {
        handled: true,
        reply: `No problem! The booking has been cancelled. Feel free to ask me to schedule a meeting anytime. 😊`,
      };
    }

    // User sent something else while confirmation pending — re-ask
    return {
      handled: true,
      reply: `Please reply *YES* to confirm your booking or *NO* to cancel.\n\n📅 *${pending.parsed.title}*\n🕐 ${formatBookingDate(pending.parsed.date)}`,
    };
  }

  // ── Step 1: Detect booking intent in message ──
  const parsed = await parseBookingIntent(message);
  if (!parsed) return { handled: false };

  // Check conflict before asking for confirmation
  const { conflicting, alternatives } = await findConflict(workspaceId, parsed.date, parsed.duration);

  if (conflicting) {
    const altLines = alternatives.length
      ? `\n\nHere are available slots on the same day:\n${alternatives.map((a, i) => `${i + 1}. ${formatBookingDate(a)}`).join("\n")}\n\nJust send the slot number or a new time to book.`
      : "\n\nPlease choose a different time.";
    return {
      handled: true,
      reply: `⚠️ *${formatBookingDate(parsed.date)}* is already booked.${altLines}`,
    };
  }

  // Save pending booking state to contact
  const pendingState: Prisma.JsonObject = {
    active: true,
    parsed: parsed as unknown as Prisma.JsonObject,
    triggeredBy: message,
  };
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      customFields: {
        ...(cf as Prisma.JsonObject),
        pendingBooking: pendingState,
      },
    },
  });

  return {
    handled: true,
    reply: `I'd like to schedule the following for you:\n\n📅 *${parsed.title}*\n🕐 ${formatBookingDate(parsed.date)}\n⏱ Duration: ${parsed.duration} minutes\n\nReply *YES* to confirm or *NO* to cancel.`,
  };
}
