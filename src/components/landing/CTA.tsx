import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "14-day free trial",
  "No credit card required",
  "Setup in less than 5 minutes",
];

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-28">
      {/* Background Glow */}
      <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-green-500/20 blur-[120px]" />

      <div className="container relative">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-10 text-white shadow-2xl lg:p-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Content */}
            <div>
              <span className="inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
                🚀 Get Started Today
              </span>

              <h2 className="mt-6 text-4xl font-extrabold leading-tight lg:text-5xl">
                Let AI handle your
                <br />
                WhatsApp conversations.
              </h2>

              <p className="mt-6 text-lg leading-8 text-green-50">
                Join businesses using Wexa AI to automate customer support,
                broadcast campaigns, and increase sales—all from one platform.
              </p>

              <div className="mt-8 space-y-4">
                {benefits.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="text-white" size={20} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content */}
            <div className="rounded-3xl bg-white p-8 text-zinc-900 shadow-xl">
              <h3 className="text-2xl font-bold">
                Start your free trial
              </h3>

              <p className="mt-3 text-zinc-600">
                Create your Wexa AI workspace and automate your customer
                conversations in minutes.
              </p>

              <Link
                href="/signup"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-green-700"
              >
                Create Free Account
                <ArrowRight size={20} />
              </Link>

              <Link
                href="/contact"
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-zinc-300 px-6 py-4 font-semibold transition hover:bg-zinc-100"
              >
                Talk to Sales
              </Link>

              <p className="mt-6 text-center text-sm text-zinc-500">
                No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}