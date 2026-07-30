"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Copy, ArrowRight, Send } from "lucide-react";

interface LibraryTemplate {
  id: string;
  name: string;
  category: string;
  tag: string;
  tagColor: string;
  header?: string;
  body: string;
  footer?: string;
  buttons?: { type: string; text: string; url?: string }[];
  emoji: string;
}

const LIBRARY: LibraryTemplate[] = [
  // Welcome & Onboarding
  {
    id: "welcome_new_customer",
    name: "welcome_new_customer",
    category: "MARKETING",
    tag: "Welcome",
    tagColor: "bg-green-100 text-green-700",
    emoji: "👋",
    header: "Welcome to {{1}}!",
    body: "Hi {{2}}, welcome aboard! 🎉\n\nWe're thrilled to have you with us. Here's what you can do next:\n\n✅ Complete your profile\n✅ Explore our features\n✅ Reach out if you need help\n\nWe're here for you every step of the way.",
    footer: "Reply STOP to unsubscribe",
    buttons: [{ type: "URL", text: "Get Started", url: "https://example.com" }],
  },
  {
    id: "account_created",
    name: "account_created",
    category: "UTILITY",
    tag: "Onboarding",
    tagColor: "bg-blue-100 text-blue-700",
    emoji: "✅",
    header: "Account Created",
    body: "Hi {{1}}, your account has been successfully created!\n\nYour login details:\n📧 Email: {{2}}\n\nPlease verify your email to activate your account.",
    footer: "This is an automated message",
    buttons: [{ type: "URL", text: "Verify Email", url: "https://example.com/verify" }],
  },

  // Order & E-commerce
  {
    id: "order_confirmed",
    name: "order_confirmed",
    category: "UTILITY",
    tag: "E-commerce",
    tagColor: "bg-orange-100 text-orange-700",
    emoji: "🛍️",
    header: "Order Confirmed! 🎉",
    body: "Hi {{1}}, your order has been confirmed!\n\n📦 Order ID: {{2}}\n💰 Total: {{3}}\n📅 Expected Delivery: {{4}}\n\nWe'll notify you once your order is shipped.",
    footer: "Thank you for shopping with us!",
    buttons: [{ type: "URL", text: "Track Order", url: "https://example.com/track" }],
  },
  {
    id: "order_shipped",
    name: "order_shipped",
    category: "UTILITY",
    tag: "E-commerce",
    tagColor: "bg-orange-100 text-orange-700",
    emoji: "🚚",
    header: "Your Order is on the Way!",
    body: "Great news, {{1}}! 🚀\n\nYour order #{{2}} has been shipped.\n\n🚚 Courier: {{3}}\n📦 Tracking ID: {{4}}\n\nEstimated delivery: {{5}}",
    footer: "Need help? Reply to this message.",
    buttons: [{ type: "URL", text: "Track Shipment", url: "https://example.com/track" }],
  },
  {
    id: "order_delivered",
    name: "order_delivered",
    category: "UTILITY",
    tag: "E-commerce",
    tagColor: "bg-orange-100 text-orange-700",
    emoji: "📦",
    body: "Hi {{1}}, your order #{{2}} has been delivered! 🎉\n\nWe hope you love your purchase. Please take a moment to share your experience.",
    footer: "Thank you for your order!",
    buttons: [{ type: "URL", text: "Leave a Review", url: "https://example.com/review" }],
  },
  {
    id: "abandoned_cart",
    name: "abandoned_cart",
    category: "MARKETING",
    tag: "E-commerce",
    tagColor: "bg-orange-100 text-orange-700",
    emoji: "🛒",
    header: "You left something behind!",
    body: "Hey {{1}}, you left items in your cart! 🛒\n\nDon't miss out — your cart is waiting for you.\n\n🔥 Complete your purchase before items sell out!",
    footer: "Offer valid for 24 hours",
    buttons: [{ type: "URL", text: "Complete Purchase", url: "https://example.com/cart" }],
  },

  // Appointments & Bookings
  {
    id: "appointment_reminder",
    name: "appointment_reminder",
    category: "UTILITY",
    tag: "Bookings",
    tagColor: "bg-purple-100 text-purple-700",
    emoji: "📅",
    header: "Appointment Reminder",
    body: "Hi {{1}}, this is a reminder for your upcoming appointment.\n\n📅 Date: {{2}}\n⏰ Time: {{3}}\n📍 Location: {{4}}\n\nPlease arrive 10 minutes early.",
    footer: "Reply to reschedule or cancel",
    buttons: [
      { type: "QUICK_REPLY", text: "Confirm ✅" },
      { type: "QUICK_REPLY", text: "Reschedule" },
    ],
  },
  {
    id: "appointment_confirmed",
    name: "appointment_confirmed",
    category: "UTILITY",
    tag: "Bookings",
    tagColor: "bg-purple-100 text-purple-700",
    emoji: "✅",
    header: "Booking Confirmed",
    body: "Hi {{1}}, your appointment is confirmed! ✅\n\n📅 Date: {{2}}\n⏰ Time: {{3}}\n🏥 With: {{4}}\n\nWe look forward to seeing you!",
    footer: "Add to your calendar",
  },

  // Promotions & Marketing
  {
    id: "flash_sale",
    name: "flash_sale",
    category: "MARKETING",
    tag: "Promotion",
    tagColor: "bg-red-100 text-red-700",
    emoji: "🔥",
    header: "🔥 Flash Sale — {{1}} OFF!",
    body: "Hey {{2}}, don't miss our biggest sale of the year! 🎉\n\n🏷️ Get {{1}} off on all products\n⏰ Offer ends: {{3}}\n\nUse code: *{{4}}* at checkout",
    footer: "T&C apply. Limited time offer.",
    buttons: [{ type: "URL", text: "Shop Now", url: "https://example.com/sale" }],
  },
  {
    id: "new_product_launch",
    name: "new_product_launch",
    category: "MARKETING",
    tag: "Promotion",
    tagColor: "bg-red-100 text-red-700",
    emoji: "🚀",
    header: "Introducing {{1}}!",
    body: "Hi {{2}}, we're excited to announce the launch of *{{1}}*! 🚀\n\n{{3}}\n\nBe among the first to experience it.",
    footer: "Limited early-bird pricing available",
    buttons: [{ type: "URL", text: "Learn More", url: "https://example.com/new" }],
  },
  {
    id: "loyalty_reward",
    name: "loyalty_reward",
    category: "MARKETING",
    tag: "Promotion",
    tagColor: "bg-red-100 text-red-700",
    emoji: "🎁",
    header: "You've Earned a Reward! 🎁",
    body: "Congratulations {{1}}! 🌟\n\nYou've earned *{{2}} points* in our loyalty program.\n\n🎁 Redeem your points for exclusive rewards and discounts.",
    footer: "Points expire in 90 days",
    buttons: [{ type: "URL", text: "Redeem Now", url: "https://example.com/rewards" }],
  },

  // Support & Service
  {
    id: "support_ticket_created",
    name: "support_ticket_created",
    category: "UTILITY",
    tag: "Support",
    tagColor: "bg-yellow-100 text-yellow-700",
    emoji: "🎫",
    header: "Support Ticket Created",
    body: "Hi {{1}}, we've received your support request.\n\n🎫 Ticket ID: #{{2}}\n📋 Issue: {{3}}\n\nOur team will get back to you within {{4}} hours.",
    footer: "Reply to this message to add more details",
  },
  {
    id: "support_resolved",
    name: "support_resolved",
    category: "UTILITY",
    tag: "Support",
    tagColor: "bg-yellow-100 text-yellow-700",
    emoji: "✅",
    header: "Issue Resolved",
    body: "Hi {{1}}, your support ticket #{{2}} has been resolved! ✅\n\nWe hope your issue is fixed. If you're still experiencing problems, please let us know.",
    footer: "We value your feedback",
    buttons: [
      { type: "QUICK_REPLY", text: "Issue Resolved ✅" },
      { type: "QUICK_REPLY", text: "Still Having Issues" },
    ],
  },

  // Payments & Finance
  {
    id: "payment_received",
    name: "payment_received",
    category: "UTILITY",
    tag: "Finance",
    tagColor: "bg-emerald-100 text-emerald-700",
    emoji: "💳",
    header: "Payment Received ✅",
    body: "Hi {{1}}, we've received your payment.\n\n💰 Amount: {{2}}\n📅 Date: {{3}}\n🧾 Invoice: #{{4}}\n\nThank you for your payment!",
    footer: "Keep this as your receipt",
  },
  {
    id: "payment_reminder",
    name: "payment_reminder",
    category: "UTILITY",
    tag: "Finance",
    tagColor: "bg-emerald-100 text-emerald-700",
    emoji: "⏰",
    header: "Payment Due Reminder",
    body: "Hi {{1}}, this is a friendly reminder that your payment of *{{2}}* is due on *{{3}}*.\n\n🧾 Invoice: #{{4}}\n\nPlease make the payment to avoid any late fees.",
    footer: "Contact us if you have any questions",
    buttons: [{ type: "URL", text: "Pay Now", url: "https://example.com/pay" }],
  },

  // Authentication
  {
    id: "otp_verification",
    name: "otp_verification",
    category: "AUTHENTICATION",
    tag: "Auth",
    tagColor: "bg-gray-100 text-gray-700",
    emoji: "🔐",
    header: "Verification Code",
    body: "Your verification code is: *{{1}}*\n\n⏰ This code expires in {{2}} minutes.\n\n🔒 Do not share this code with anyone.",
    footer: "If you didn't request this, ignore this message",
  },
  {
    id: "password_reset",
    name: "password_reset",
    category: "AUTHENTICATION",
    tag: "Auth",
    tagColor: "bg-gray-100 text-gray-700",
    emoji: "🔑",
    header: "Password Reset Request",
    body: "Hi {{1}}, we received a request to reset your password.\n\nClick the link below to reset your password. This link expires in {{2}} hours.\n\n🔒 If you didn't request this, please ignore this message.",
    footer: "For security, never share this link",
    buttons: [{ type: "URL", text: "Reset Password", url: "https://example.com/reset" }],
  },

  // Feedback & Reviews
  {
    id: "feedback_request",
    name: "feedback_request",
    category: "MARKETING",
    tag: "Feedback",
    tagColor: "bg-pink-100 text-pink-700",
    emoji: "⭐",
    header: "How was your experience?",
    body: "Hi {{1}}, thank you for choosing us! 😊\n\nWe'd love to hear about your experience with {{2}}.\n\nYour feedback helps us improve and serve you better.",
    footer: "Takes less than 1 minute",
    buttons: [
      { type: "QUICK_REPLY", text: "😍 Excellent" },
      { type: "QUICK_REPLY", text: "😊 Good" },
      { type: "QUICK_REPLY", text: "😐 Average" },
    ],
  },
  {
    id: "nps_survey",
    name: "nps_survey",
    category: "MARKETING",
    tag: "Feedback",
    tagColor: "bg-pink-100 text-pink-700",
    emoji: "📊",
    header: "Quick Survey",
    body: "Hi {{1}}, on a scale of 1–10, how likely are you to recommend *{{2}}* to a friend or colleague?\n\nYour honest feedback means a lot to us! 🙏",
    footer: "This survey takes 30 seconds",
    buttons: [{ type: "URL", text: "Take Survey", url: "https://example.com/survey" }],
  },
];

const ALL_TAGS = ["All", ...Array.from(new Set(LIBRARY.map(t => t.tag)))];

export default function TemplateLibraryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<LibraryTemplate>(LIBRARY[0]);

  const filtered = LIBRARY.filter(t => {
    const matchTag = activeTag === "All" || t.tag === activeTag;
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase()) ||
      t.tag.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  function useTemplate(t: LibraryTemplate) {
    const params = new URLSearchParams({
      new: "1",
      prefill: JSON.stringify({
        name: t.name,
        category: t.category,
        header: t.header ?? "",
        body: t.body,
        footer: t.footer ?? "",
        buttons: t.buttons ?? [],
      }),
    });
    router.push(`/dashboard/templates?${params.toString()}`);
  }

  function copyBody(t: LibraryTemplate) {
    navigator.clipboard.writeText(t.body);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-800">Template Library</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">{LIBRARY.length} ready-to-use WhatsApp templates</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-44 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── Main split layout ──────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: scrollable grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">

          {/* Tag filters */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeTag === tag
                    ? "bg-green-600 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Count */}
          <p className="text-xs text-gray-400">
            {filtered.length} template{filtered.length !== 1 ? "s" : ""} found
          </p>

          {/* 2-column grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <p className="text-sm">No templates match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(t => {
                const isSelected = preview.id === t.id;
                return (
                  <div
                    key={t.id}
                    onMouseEnter={() => setPreview(t)}
                    onClick={() => setPreview(t)}
                    className={`flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${
                      isSelected
                        ? "border-green-400 ring-2 ring-green-100"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{t.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{t.category}</p>
                        </div>
                      </div>
                      <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.tagColor}`}>
                        {t.tag}
                      </span>
                    </div>

                    {/* WhatsApp bubble preview */}
                    <div className="flex-1 bg-[#e5ddd5] px-4 py-4">
                      <div className="ml-auto max-w-[92%] rounded-lg bg-white shadow-sm overflow-hidden">
                        {t.header && (
                          <div className="px-3 pt-2.5 pb-1 border-b border-gray-50">
                            <p className="text-[12px] font-bold text-gray-800 leading-snug">{t.header}</p>
                          </div>
                        )}
                        <div className="px-3 pt-2 pb-1">
                          <p className="text-[12px] text-gray-800 leading-relaxed whitespace-pre-line line-clamp-5">
                            {t.body}
                          </p>
                        </div>
                        {t.footer && (
                          <div className="px-3 pb-1.5">
                            <p className="text-[10px] text-gray-400">{t.footer}</p>
                          </div>
                        )}
                        <div className="flex justify-end px-2 pb-1">
                          <span className="text-[10px] text-gray-400">10:30 AM ✓✓</span>
                        </div>
                        {t.buttons && t.buttons.length > 0 && (
                          <div className="border-t border-gray-100">
                            {t.buttons.map((b, i) => (
                              <div
                                key={i}
                                className={`flex items-center justify-center py-1.5 text-[11px] font-medium text-[#00a884] ${
                                  i < t.buttons!.length - 1 ? "border-b border-gray-100" : ""
                                }`}
                              >
                                {b.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-gray-100">
                      <button
                        onClick={e => { e.stopPropagation(); copyBody(t); }}
                        className="flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 transition"
                      >
                        <Copy size={11} />
                        {copied === t.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); useTemplate(t); }}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700 transition"
                      >
                        Use Template <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Mobile WhatsApp preview panel */}
        <div className="hidden lg:flex flex-col w-[340px] shrink-0 border-l border-gray-200 bg-white overflow-hidden">

          {/* Panel header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{preview.name}</p>
          </div>

          {/* Phone frame */}
          <div className="flex flex-1 items-center justify-center py-4 px-3 bg-[#f0f2f5] overflow-hidden">
            <div className="relative" style={{ width: 218 }}>
              {/* Side buttons */}
              <div className="absolute -left-[4px] top-[68px] w-[3px] h-6 rounded-l bg-gray-700" />
              <div className="absolute -left-[4px] top-[100px] w-[3px] h-9 rounded-l bg-gray-700" />
              <div className="absolute -left-[4px] top-[144px] w-[3px] h-9 rounded-l bg-gray-700" />
              <div className="absolute -right-[4px] top-[108px] w-[3px] h-12 rounded-r bg-gray-700" />

              {/* Phone shell */}
              <div className="flex flex-col rounded-[2.4rem] border-[5px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden" style={{ height: 448 }}>
                <div className="flex flex-col flex-1 overflow-hidden rounded-[1.9rem] bg-white">

                  {/* Status bar — teal to blend with WA header */}
                  <div className="relative flex items-center justify-between px-4 pt-[7px] pb-[3px] bg-[#075E54] shrink-0">
                    <span className="text-[9px] font-semibold text-white">9:41</span>
                    <div className="absolute left-1/2 -translate-x-1/2 top-[4px] w-[44px] h-[13px] rounded-full bg-gray-900" />
                    <div className="flex items-center gap-[3px]">
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="white">
                        <rect x="0" y="5" width="2" height="3" rx="0.4" opacity="0.4"/>
                        <rect x="3" y="3" width="2" height="5" rx="0.4" opacity="0.6"/>
                        <rect x="6" y="1" width="2" height="7" rx="0.4"/>
                        <rect x="9" y="0" width="2" height="8" rx="0.4"/>
                      </svg>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="1.3">
                        <path d="M0.5 3C2 1.2 8 1.2 9.5 3" strokeLinecap="round"/>
                        <path d="M2 5C3 3.8 7 3.8 8 5" strokeLinecap="round"/>
                        <circle cx="5" cy="7" r="0.9" fill="white" stroke="none"/>
                      </svg>
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <rect x="0.5" y="0.5" width="12" height="7" rx="1.5" stroke="white" strokeWidth="0.9"/>
                        <rect x="1.5" y="1.5" width="9" height="5" rx="0.8" fill="white"/>
                        <path d="M13.5 2.5 C14.5 2.5 14.5 5.5 13.5 5.5" stroke="white" strokeWidth="0.9" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* WA chat header */}
                  <div className="flex items-center gap-2 px-2 py-[7px] bg-[#075E54] shrink-0">
                    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 1L1 6.5L7 12"/>
                    </svg>
                    <div className="w-[26px] h-[26px] rounded-full bg-[#DFE5E7] flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#aaa">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[10px] font-semibold leading-none truncate">{preview.name.replace(/_/g, " ")}</p>
                      <p className="text-[#b2dfdb] text-[8px] mt-[2px]">online</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white" opacity="0.9">
                        <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white" opacity="0.9">
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                      </svg>
                      <svg width="3" height="11" viewBox="0 0 4 16" fill="white" opacity="0.9">
                        <circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/>
                      </svg>
                    </div>
                  </div>

                  {/* Chat area with WA wallpaper */}
                  <div
                    className="flex-1 overflow-y-auto px-2 py-2 flex flex-col justify-end gap-1"
                    style={{
                      background: "#e5ddd5",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bdb8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    <div className="relative ml-auto" style={{ maxWidth: "88%" }}>
                      {/* Green bubble with tail */}
                      <div className="relative rounded-tl-xl rounded-bl-xl rounded-br-xl bg-[#dcf8c6] shadow-sm overflow-hidden">
                        <div className="absolute -right-[6px] top-0 w-0 h-0"
                          style={{ borderLeft: "7px solid #dcf8c6", borderBottom: "7px solid transparent" }} />
                        {preview.header && (
                          <div className="px-2 pt-2 pb-1 border-b border-[#c5e8b0]">
                            <p className="text-[10px] font-bold text-gray-900 leading-snug">{preview.header}</p>
                          </div>
                        )}
                        <div className="px-2 pt-1.5 pb-0.5">
                          <p className="text-[9.5px] text-gray-800 leading-relaxed whitespace-pre-line">{preview.body}</p>
                        </div>
                        {preview.footer && (
                          <div className="px-2 pb-0.5">
                            <p className="text-[8px] text-gray-400 italic">{preview.footer}</p>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1 px-2 pb-1">
                          <span className="text-[7.5px] text-[#667781]">10:30 AM</span>
                          <svg width="14" height="8" viewBox="0 0 16 11" fill="#53bdeb">
                            <path d="M15.854 1.146a.5.5 0 00-.707 0L6.5 9.793 1.854 5.146a.5.5 0 00-.707.707l5 5a.5.5 0 00.707 0l9.5-9.5a.5.5 0 000-.707z"/>
                            <path d="M11.854 1.146a.5.5 0 00-.707 0L6.5 5.793 5.354 4.646a.5.5 0 00-.707.707L6.5 7.207l5.354-5.354a.5.5 0 000-.707z" transform="translate(-3,0)"/>
                          </svg>
                        </div>
                      </div>
                      {/* CTA buttons */}
                      {preview.buttons && preview.buttons.length > 0 && (
                        <div className="mt-[2px] flex flex-col gap-[2px]">
                          {preview.buttons.map((b, i) => (
                            <div key={i} className="bg-[#dcf8c6] rounded-lg flex items-center justify-center gap-1 py-1.5">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="#00a884">
                                {b.type === "URL"
                                  ? <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                  : b.type === "PHONE_NUMBER"
                                  ? <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                                  : <path d="M3 10h18M3 6h18M3 14h12"/>}
                              </svg>
                              <span className="text-[9px] font-semibold text-[#00a884]">{b.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WA input bar */}
                  <div className="flex items-center gap-1.5 px-1.5 py-1.5 bg-[#f0f2f5] shrink-0">
                    <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#8696a0">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5-6H6.5C7 7.5 9.3 6 12 6s5 1.5 5.5 4.5z"/>
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center bg-white rounded-full px-2.5 py-[5px] gap-1">
                      <span className="text-[8.5px] text-[#8696a0] flex-1">Message</span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#8696a0">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S6 2.79 6 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                    </div>
                    <div className="w-[26px] h-[26px] rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="flex justify-center py-1 bg-[#f0f2f5] shrink-0">
                    <div className="w-14 h-[3px] rounded-full bg-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 border-t border-gray-100 space-y-2 shrink-0">
            <button
              onClick={() => useTemplate(preview)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition shadow-sm"
            >
              <Send size={14} /> Use Template
            </button>
            <button
              onClick={() => copyBody(preview)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              <Copy size={12} />
              {copied === preview.id ? "Copied!" : "Copy Body"}
            </button>

            {/* Meta tags */}
            <div className="flex items-center gap-1.5 justify-center flex-wrap pt-0.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${preview.tagColor}`}>
                {preview.tag}
              </span>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">
                {preview.category}
              </span>
            </div>
          </div>
        </div>

      </div>{/* end split layout */}
    </div>
  );
}
