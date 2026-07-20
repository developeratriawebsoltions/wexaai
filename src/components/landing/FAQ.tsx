"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Wexa AI?",
    answer:
      "Wexa AI is an AI-powered WhatsApp automation platform that helps businesses manage customer conversations, automate replies, run broadcast campaigns, and collaborate with their team from a single dashboard.",
  },
  {
    question: "How do I connect my WhatsApp Business account?",
    answer:
      "Simply log in to your Wexa AI dashboard and connect your WhatsApp Business account using Meta's official WhatsApp Cloud API. The setup takes only a few minutes.",
  },
  {
    question: "Can AI reply automatically to my customers?",
    answer:
      "Yes. Wexa AI can automatically answer customer questions, provide product information, qualify leads, and transfer conversations to a human agent whenever needed.",
  },
  {
    question: "Can I send broadcast messages?",
    answer:
      "Yes. You can send WhatsApp broadcasts using approved message templates while following Meta's WhatsApp Business Platform policies.",
  },
  {
    question: "Can multiple team members use the same WhatsApp number?",
    answer:
      "Absolutely. Your entire support or sales team can manage customer conversations together from one shared inbox.",
  },
  {
    question: "Is my customer data secure?",
    answer:
      "Yes. We use encrypted communication, secure authentication, and role-based access controls to help protect your business and customer data.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="bg-white py-24"
    >
      <div className="container max-w-4xl">
        {/* Heading */}

        <div className="text-center">
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Frequently Asked Questions
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
            Everything you need to know
          </h2>

          <p className="mt-5 text-lg text-zinc-600">
            Still have questions? Our team is here to help you.
          </p>
        </div>

        {/* FAQ List */}

        <div className="mt-16 space-y-5">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg"
            >
              <button
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
                className="flex w-full items-center justify-between p-6 text-left"
              >
                <h3 className="text-lg font-semibold text-zinc-900">
                  {faq.question}
                </h3>

                <ChevronDown
                  size={22}
                  className={`transition duration-300 ${
                    open === index ? "rotate-180" : ""
                  }`}
                />
              </button>

              <div
                className={`grid transition-all duration-300 ${
                  open === index
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-zinc-100 px-6 pb-6 pt-5">
                    <p className="leading-7 text-zinc-600">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}

        <div className="mt-16 rounded-3xl bg-green-600 p-10 text-center text-white">
          <h3 className="text-2xl font-bold">
            Still have questions?
          </h3>

          <p className="mt-3 text-green-100">
            Our team is ready to help you get started with Wexa AI.
          </p>

          <button className="mt-6 rounded-xl bg-white px-8 py-4 font-semibold text-green-700 transition hover:scale-105">
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
}