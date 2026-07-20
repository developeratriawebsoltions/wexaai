import {
  Bot,
  MessageCircle,
  Megaphone,
  Users,
  BarChart3,
  Workflow,
  ShieldCheck,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Customer Agent",
    description:
      "Provide instant, intelligent replies 24/7 using AI trained on your business knowledge.",
  },
  {
    icon: MessageCircle,
    title: "Shared Team Inbox",
    description:
      "Manage all WhatsApp conversations from one collaborative inbox with unlimited agents.",
  },
  {
    icon: Megaphone,
    title: "Broadcast Campaigns",
    description:
      "Send promotional campaigns and updates to thousands of customers using approved templates.",
  },
  {
    icon: Workflow,
    title: "Smart Automation",
    description:
      "Automate welcome messages, follow-ups, lead qualification, and support workflows.",
  },
  {
    icon: Users,
    title: "Customer CRM",
    description:
      "Organize contacts with tags, notes, conversation history, and customer profiles.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track conversations, response time, agent performance, and campaign insights.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "Role-based permissions, encrypted data, secure APIs, and reliable infrastructure.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Deliver AI responses in seconds with a high-performance and scalable backend.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="bg-zinc-50 py-24"
    >
      <div className="container">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Powerful Features
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
            Everything you need to grow your business on WhatsApp
          </h2>

          <p className="mt-5 text-lg leading-8 text-zinc-600">
            Wexa AI combines AI, automation, broadcasting, team collaboration,
            and analytics into one modern platform.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-3xl border border-zinc-200 bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-green-500 hover:shadow-2xl"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 transition-all duration-300 group-hover:bg-green-600 group-hover:text-white">
                  <Icon size={30} />
                </div>

                <h3 className="mt-6 text-xl font-bold text-zinc-900">
                  {feature.title}
                </h3>

                <p className="mt-4 leading-7 text-zinc-600">
                  {feature.description}
                </p>

                <button className="mt-6 font-semibold text-green-600 transition hover:text-green-700">
                  Learn more →
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}