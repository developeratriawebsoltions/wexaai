import {
  UserPlus,
  Smartphone,
  Bot,
  TrendingUp,
} from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Workspace",
    description:
      "Sign up for Wexa AI in minutes and create your business workspace. Invite your team members and manage everything from one place.",
  },
  {
    icon: Smartphone,
    step: "02",
    title: "Connect WhatsApp",
    description:
      "Securely connect your WhatsApp Business account using Meta Cloud API and start receiving customer messages instantly.",
  },
  {
    icon: Bot,
    step: "03",
    title: "Train Your AI Agent",
    description:
      "Customize your AI assistant with your business information, FAQs, products, pricing, and support knowledge.",
  },
  {
    icon: TrendingUp,
    step: "04",
    title: "Automate & Grow",
    description:
      "AI automatically replies to customers, broadcasts campaigns, and helps your team close more conversations faster.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-slate-50 py-24"
    >
      <div className="container">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-semibold uppercase tracking-[0.15em] text-green-700 shadow-sm">
            How it works
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
            Launch your AI-powered WhatsApp support
            in just a few minutes
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            Trusted by teams who want smarter customer journeys. Connect your business, train your AI, and start helping customers with speed and consistency.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mt-20">
          {/* Desktop Line */}
          <div className="absolute left-0 right-0 top-10 hidden h-1 bg-zinc-200 lg:block" />

          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.step}
                  className="relative animate-fade-up"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 right-0 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    {item.step}
                  </div>

                  <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-3 hover:border-green-500 hover:shadow-2xl">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-green-700 shadow-sm">
                      <Icon size={28} />
                    </div>

                    <h3 className="mt-6 text-2xl font-semibold text-zinc-900">
                      {item.title}
                    </h3>

                    <p className="mt-4 leading-7 text-zinc-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="mt-24 overflow-hidden rounded-[32px] bg-gradient-to-r from-green-600 to-emerald-500 p-10 text-center text-white shadow-2xl lg:p-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20">
              Proven results for over 10 years
            </span>

            <h3 className="mt-6 text-3xl font-bold lg:text-4xl">
              Ready to automate customer conversations at scale?
            </h3>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-green-100">
              Join businesses using Wexa AI to deliver faster support, smarter automation, and better customer experiences.
            </p>

            <button className="group mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-green-700 shadow-xl transition duration-300 hover:scale-105 hover:bg-slate-50">
              Get Started Free
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}