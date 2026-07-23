import Link from "next/link";
import { ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="hero-bg w-full">
      <div className="container mx-auto px-4 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-8 items-center lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight tracking-tight text-zinc-900">
              Automate Your
              <span className="gradient-text block">
                WhatsApp Business
              </span>
              with AI
            </h1>

            <p className="mt-4 sm:mt-5 md:mt-6 text-base sm:text-lg md:text-lg leading-7 sm:leading-8 text-zinc-600 max-w-xl">
              Wexa AI helps businesses automate customer support, AI replies,
              broadcasts, shared team inbox, and WhatsApp campaigns—all from one
              powerful dashboard.
            </p>

            <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col gap-3 sm:gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl bg-green-600 px-5 sm:px-7 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white transition hover:bg-green-700 w-full sm:w-auto"
              >
                Start Free
                <ArrowRight size={18} className="sm:w-5 sm:h-5" />
              </Link>

              <Link
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-lg sm:rounded-xl border border-zinc-300 bg-white px-5 sm:px-7 py-3 sm:py-4 text-base sm:text-lg font-semibold text-zinc-700 transition hover:bg-zinc-100 w-full sm:w-auto"
              >
                <PlayCircle size={18} className="sm:w-5 sm:h-5" />
                Book Demo
              </Link>
            </div>

            <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
                <span className="text-xs sm:text-sm text-zinc-600">
                  No Credit Card
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
                <span className="text-xs sm:text-sm text-zinc-600">
                  5-Min Setup
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
                <span className="text-xs sm:text-sm text-zinc-600">
                  24/7 AI Support
                </span>
              </div>
            </div>
          </div>

          {/* Right Dashboard Preview */}
          <div className="order-1 lg:order-2 relative">
            {/* Background Glow */}
            <div className="absolute inset-0 -z-10 rounded-full bg-green-300/20 blur-3xl"></div>

            <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-200 bg-white shadow-xl sm:shadow-2xl">
              {/* Top Bar */}
              <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 sm:px-5 py-3 sm:py-4">
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-red-400"></div>
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-yellow-400"></div>
                <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-500"></div>
              </div>

              {/* Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] lg:grid-cols-[180px_1fr] xl:grid-cols-[230px_1fr]">
                {/* Sidebar */}
                <aside className="hidden md:flex md:flex-col space-y-2 md:space-y-3 lg:space-y-4 border-r border-zinc-200 bg-zinc-50 p-3 sm:p-4 lg:p-5">
                  <div className="h-7 md:h-8 lg:h-10 rounded-lg bg-green-600"></div>

                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-7 md:h-8 lg:h-10 rounded-lg bg-zinc-200"
                    />
                  ))}
                </aside>

                {/* Content */}
                <main className="space-y-3 sm:space-y-4 md:space-y-5 p-3 sm:p-4 md:p-5 lg:p-6">
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-lg md:rounded-xl bg-green-50 p-3 md:p-4 lg:p-5"
                      >
                        <div className="h-3 md:h-4 w-16 md:w-20 rounded bg-green-200"></div>
                        <div className="mt-2 md:mt-4 h-6 md:h-8 w-14 md:w-16 rounded bg-green-500"></div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl md:rounded-2xl bg-zinc-100 p-3 md:p-4 lg:p-6">
                    <div className="mb-3 md:mb-4 h-4 md:h-5 w-32 md:w-40 rounded bg-zinc-300"></div>

                    <div className="space-y-2 md:space-y-3 lg:space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 md:gap-3 lg:gap-4"
                        >
                          <div className="h-8 md:h-10 lg:h-12 w-8 md:w-10 lg:w-12 rounded-full bg-green-500 flex-shrink-0"></div>

                          <div className="flex-1 min-w-0">
                            <div className="h-3 md:h-4 w-24 md:w-32 rounded bg-zinc-300"></div>
                            <div className="mt-1 md:mt-2 h-2 md:h-3 w-full rounded bg-zinc-200"></div>
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
      </div>
    </section>
  );
}