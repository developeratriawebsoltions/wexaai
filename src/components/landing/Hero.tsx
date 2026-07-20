import Link from "next/link";
import { ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero-bg overflow-hidden">
      <div className="container grid min-h-[90vh] items-center gap-16 py-20 lg:grid-cols-2">
        {/* Left Content */}
        <div>
          <h1 className="mt-8 text-5xl font-extrabold leading-tight tracking-tight text-zinc-900 lg:text-7xl">
            Automate Your
            <span className="gradient-text block">
              WhatsApp Business
            </span>
            with AI
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
            Wexa AI helps businesses automate customer support, AI replies,
            broadcasts, shared team inbox, and WhatsApp campaigns—all from one
            powerful dashboard.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-7 py-4 text-lg font-semibold text-white transition hover:bg-green-700"
            >
              Start Free
              <ArrowRight size={20} />
            </Link>

            <Link
              href="#demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-7 py-4 text-lg font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              <PlayCircle size={20} />
              Book Demo
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <span className="text-sm text-zinc-600">
                No Credit Card
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <span className="text-sm text-zinc-600">
                5-Min Setup
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <span className="text-sm text-zinc-600">
                24/7 AI Support
              </span>
            </div>
          </div>
        </div>

        {/* Right Dashboard Preview */}
        <div className="relative">
          {/* Background Glow */}
          <div className="absolute inset-0 -z-10 rounded-full bg-green-300/20 blur-3xl"></div>

          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
            {/* Top Bar */}
            <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>

            {/* Dashboard */}
            <div className="grid grid-cols-[230px_1fr]">
              {/* Sidebar */}
              <aside className="space-y-4 border-r border-zinc-200 bg-zinc-50 p-5">
                <div className="h-10 rounded-lg bg-green-600"></div>

                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-zinc-200"
                  />
                ))}
              </aside>

              {/* Content */}
              <main className="space-y-5 p-6">
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-green-50 p-5"
                    >
                      <div className="h-4 w-20 rounded bg-green-200"></div>
                      <div className="mt-4 h-8 w-16 rounded bg-green-500"></div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-zinc-100 p-6">
                  <div className="mb-4 h-5 w-40 rounded bg-zinc-300"></div>

                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4"
                      >
                        <div className="h-12 w-12 rounded-full bg-green-500"></div>

                        <div className="flex-1">
                          <div className="h-4 w-32 rounded bg-zinc-300"></div>
                          <div className="mt-2 h-3 w-full rounded bg-zinc-200"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}