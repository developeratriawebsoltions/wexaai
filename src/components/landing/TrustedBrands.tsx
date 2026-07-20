import {
  ShoppingBag,
  Stethoscope,
  GraduationCap,
  Building2,
  Briefcase,
  Store,
} from "lucide-react";

const industries = [
  {
    icon: ShoppingBag,
    title: "E-commerce",
  },
  {
    icon: Store,
    title: "Retail",
  },
  {
    icon: Stethoscope,
    title: "Healthcare",
  },
  {
    icon: GraduationCap,
    title: "Education",
  },
  {
    icon: Building2,
    title: "Real Estate",
  },
  {
    icon: Briefcase,
    title: "Agencies",
  },
];

const stats = [
  {
    value: "24/7",
    label: "AI Customer Support",
  },
  {
    value: "99.9%",
    label: "Platform Uptime",
  },
  {
    value: "< 1s",
    label: "Average Response",
  },
  {
    value: "Multi",
    label: "Team Collaboration",
  },
];

export default function TrustedBrands() {
  return (
    <section className="border-y border-zinc-200 bg-white py-20">
      <div className="container">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Built for Modern Businesses
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900">
            Trusted by businesses across multiple industries
          </h2>

          <p className="mt-4 text-lg text-zinc-600">
            Wexa AI helps businesses automate WhatsApp conversations,
            customer support, marketing campaigns, and sales.
          </p>
        </div>

        {/* Industries */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {industries.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-green-500 hover:shadow-xl"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 text-green-600 transition group-hover:bg-green-600 group-hover:text-white">
                  <Icon size={28} />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-zinc-900">
                  {item.title}
                </h3>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-20 grid gap-6 rounded-3xl bg-zinc-900 p-10 text-white md:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="text-center">
              <h3 className="text-4xl font-bold text-green-400">
                {item.value}
              </h3>

              <p className="mt-2 text-zinc-300">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}