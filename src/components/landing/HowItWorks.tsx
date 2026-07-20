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
      className="bg-white py-24"
    >
      <div className="container">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            How It Works
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
            Launch your AI-powered WhatsApp support
            in just a few minutes
          </h2>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            No complicated setup. Connect your business,
            train your AI, and start helping customers
            automatically.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mt-20">
          {/* Desktop Line */}
          <div className="absolute left-0 right-0 top-10 hidden h-1 bg-zinc-200 lg:block" />

          <div className="grid gap-10 lg:grid-cols-4">
            {steps.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.step}
                  className="relative"
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 right-0 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                    {item.step}
                  </div>

                  <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-green-500 hover:shadow-xl">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600">
                      <Icon size={30} />
                    </div>

                    <h3 className="mt-6 text-2xl font-bold text-zinc-900">
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
        <div className="mt-24 rounded-3xl bg-gradient-to-r from-green-600 to-emerald-500 p-10 text-center text-white lg:p-16">
          <h3 className="text-3xl font-bold lg:text-4xl">
            Ready to automate your customer conversations?
          </h3>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-green-50">
            Join businesses using Wexa AI to deliver faster support,
            smarter automation, and better customer experiences.
          </p>

          <button className="mt-8 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-green-700 transition hover:scale-105">
            Get Started Free
          </button>
        </div>
      </div>
    </section>
  );
}