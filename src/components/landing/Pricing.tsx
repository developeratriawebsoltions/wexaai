import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "₹999",
    description: "Perfect for small businesses getting started.",
    button: "Start Free",
    popular: false,
    features: [
      "1 WhatsApp Number",
      "1 Team Member",
      "AI Auto Replies",
      "500 Contacts",
      "Basic Broadcast",
      "Email Support",
    ],
  },
  {
    name: "Growth",
    price: "₹2,999",
    description: "Best for growing teams and businesses.",
    button: "Get Started",
    popular: true,
    features: [
      "3 WhatsApp Numbers",
      "10 Team Members",
      "Unlimited AI Replies",
      "10,000 Contacts",
      "Broadcast Campaigns",
      "Analytics Dashboard",
      "CRM Integration",
      "Priority Support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Advanced features for large organizations.",
    button: "Contact Sales",
    popular: false,
    features: [
      "Unlimited Numbers",
      "Unlimited Team Members",
      "Custom AI Agent",
      "API Access",
      "SSO & Security",
      "Dedicated Manager",
      "Custom Integrations",
      "24/7 Premium Support",
    ],
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="bg-zinc-50 py-24"
    >
      <div className="container">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Pricing
          </span>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 lg:text-5xl">
            Simple pricing for every business
          </h2>

          <p className="mt-5 text-lg text-zinc-600">
            Choose the perfect plan and scale as your business grows.
            No hidden fees. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-20 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                plan.popular
                  ? "border-green-500 shadow-xl"
                  : "border-zinc-200"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white">
                  <Sparkles size={16} />
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold">{plan.name}</h3>

              <p className="mt-3 text-zinc-600">
                {plan.description}
              </p>

              <div className="mt-8 flex items-end gap-1">
                <span className="text-5xl font-extrabold">
                  {plan.price}
                </span>

                {plan.price !== "Custom" && (
                  <span className="mb-2 text-zinc-500">
                    /month
                  </span>
                )}
              </div>

              <button
                className={`mt-8 w-full rounded-xl py-4 font-semibold transition ${
                  plan.popular
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "border border-zinc-300 hover:bg-zinc-100"
                }`}
              >
                {plan.button}
              </button>

              <div className="my-8 h-px bg-zinc-200" />

              <ul className="space-y-5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                      <Check
                        size={14}
                        className="text-green-600"
                      />
                    </div>

                    <span className="text-zinc-700">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Text */}
        <div className="mt-16 text-center">
          <p className="text-zinc-600">
            ✓ 14-day free trial &nbsp; • &nbsp;
            ✓ No credit card required &nbsp; • &nbsp;
            ✓ Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}