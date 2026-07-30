"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ChevronDown, Radio, Bot, Zap, CreditCard, LayoutGrid, MessageSquare, BookOpen, FileText, MousePointerClick, CalendarDays, Rocket, TrendingUp, Building2, Phone, Layers, ShoppingCart, Headphones, BarChart2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const featuresItems = [
  { icon: Radio,           title: "Bulk WhatsApp Broadcast",    desc: "Reach Everyone Instantly with Bulk WhatsApp Broadcast",        href: "#features" },
  { icon: MessageSquare,   title: "Shared Inbox",               desc: "Centralized Communication with Shared Inbox",                  href: "#features" },
  { icon: Bot,             title: "WhatsApp Chatbot",           desc: "Automate Responses with a WhatsApp Chatbot",                   href: "#features" },
  { icon: BookOpen,        title: "WhatsApp Catalog",           desc: "Showcase Resources with WhatsApp Catalog",                     href: "#features" },
  { icon: Zap,             title: "AI Agent",                   desc: "Create smart AI Agents inside WhatsApp that understands your business", href: "#features" },
  { icon: FileText,        title: "WhatsApp Forms",             desc: "Create and share forms that collect responses directly on WhatsApp", href: "#features" },
  { icon: CreditCard,      title: "WhatsApp Payments",          desc: "Accept payments seamlessly on WhatsApp",                       href: "#features" },
  { icon: MousePointerClick, title: "Click To WhatsApp Ads",   desc: "Drive instant conversations with ads that open directly in WhatsApp", href: "#features" },
  { icon: LayoutGrid,      title: "Omnichannel Inbox",          desc: "Manage WhatsApp, Instagram and Facebook from a single inbox",  href: "#features" },
  { icon: CalendarDays,    title: "WhatsApp Appointment Booking", desc: "Let customers book appointments directly on WhatsApp",       href: "#features" },
];

const integrationItems = [
  { icon: Phone,       title: "WhatsApp Cloud API",   desc: "Connect your WhatsApp Business Account",         href: "#integrations" },
  { icon: Layers,      title: "Meta Business Suite",  desc: "Manage messages and insights from Meta",          href: "#integrations" },
  { icon: Zap,         title: "Zapier",               desc: "Automate workflows with 6,000+ apps",             href: "#integrations" },
  { icon: LayoutGrid,  title: "Make (Integromat)",    desc: "Build advanced automation across apps",           href: "#integrations" },
  { icon: BarChart2,   title: "HubSpot",              desc: "Sync contacts and automate conversations",        href: "#integrations" },
  { icon: ShoppingCart, title: "Shopify",             desc: "Send order updates and manage customers",         href: "#integrations" },
  { icon: Headphones,  title: "Zendesk",              desc: "Create tickets and manage support",               href: "#integrations" },
  { icon: CreditCard,  title: "WooCommerce",          desc: "Notify customers and sync orders",                href: "#integrations" },
];

const pricingItems = [
  { icon: Rocket,    title: "Starter",    price: "₹999/mo",    desc: "Perfect for small businesses getting started.",    href: "#pricing" },
  { icon: TrendingUp, title: "Growth",   price: "₹2,999/mo",  desc: "Best for growing teams and businesses.",           href: "#pricing", popular: true },
  { icon: Building2, title: "Enterprise", price: "Custom",    desc: "Advanced features for large organizations.",       href: "#pricing" },
];

const navLinks = [
  { name: "How it Works", href: "#how-it-works" },
  { name: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [mobilePricingOpen, setMobilePricingOpen] = useState(false);
  const [mobileIntegrationsOpen, setMobileIntegrationsOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  const isLoggedIn = !loading && !!user;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo/wexaai.png"
            alt="Wexa AI Logo"
            width={140}
            height={50}
            priority
            className="h-auto w-auto max-w-xs"
            style={{ maxWidth: '140px', height: 'auto' }}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {/* Features Dropdown */}
          <div className="relative" onMouseEnter={() => setFeaturesOpen(true)} onMouseLeave={() => setFeaturesOpen(false)}>
            <button className="flex items-center gap-1 text-base font-bold text-zinc-600 transition hover:text-green-600">
              Features <ChevronDown size={16} className={`transition-transform ${featuresOpen ? "rotate-180" : ""}`} />
            </button>
            {featuresOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-[640px] -translate-x-1/2 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-100">
                <div className="grid grid-cols-2 gap-4">
                  {featuresItems.map((item) => (
                    <Link key={item.title} href={item.href} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-zinc-50">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                        <item.icon size={20} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{item.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Integrations Dropdown */}
          <div className="relative" onMouseEnter={() => setIntegrationsOpen(true)} onMouseLeave={() => setIntegrationsOpen(false)}>
            <button className="flex items-center gap-1 text-base font-bold text-zinc-600 transition hover:text-green-600">
              Integrations <ChevronDown size={16} className={`transition-transform ${integrationsOpen ? "rotate-180" : ""}`} />
            </button>
            {integrationsOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-[640px] -translate-x-1/2 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-100">
                <div className="grid grid-cols-2 gap-4">
                  {integrationItems.map((item) => (
                    <Link key={item.title} href={item.href} className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-zinc-50">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                        <item.icon size={20} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{item.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pricing Dropdown */}
          <div className="relative" onMouseEnter={() => setPricingOpen(true)} onMouseLeave={() => setPricingOpen(false)}>
            <button className="flex items-center gap-1 text-base font-bold text-zinc-600 transition hover:text-green-600">
              Pricing <ChevronDown size={16} className={`transition-transform ${pricingOpen ? "rotate-180" : ""}`} />
            </button>
            {pricingOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-3 w-[480px] -translate-x-1/2 rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-100">
                <div className="flex flex-col gap-3">
                  {pricingItems.map((item) => (
                    <Link key={item.title} href={item.href} className="flex items-center gap-4 rounded-xl p-3 transition hover:bg-zinc-50">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                        <item.icon size={20} />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-800">{item.title}</p>
                          {item.popular && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Popular</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">{item.desc}</p>
                      </div>
                      <span className="text-sm font-bold text-zinc-800">{item.price}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-base font-bold text-zinc-600 transition hover:text-green-600"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-4 lg:flex">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/inbox"
                className="text-base font-bold text-zinc-700 transition hover:text-green-600"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="rounded-xl bg-green-600 px-5 py-3 text-base font-bold text-white transition hover:bg-green-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-base font-bold text-zinc-700 transition hover:text-green-600"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-green-600 px-5 py-3 text-base font-bold text-white transition hover:bg-green-700"
              >
                Start Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 lg:hidden"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-zinc-200 bg-white lg:hidden">
          <div className="container flex flex-col py-6">
            {/* Mobile Features Accordion */}
            <button
              onClick={() => setFeaturesOpen(!featuresOpen)}
              className="flex items-center justify-between py-4 text-lg font-bold text-zinc-700"
            >
              Features <ChevronDown size={18} className={`transition-transform ${featuresOpen ? "rotate-180" : ""}`} />
            </button>
            {featuresOpen && (
              <div className="mb-2 flex flex-col gap-1 pl-2">
                {featuresItems.map((item) => (
                  <Link key={item.title} href={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600"><item.icon size={16} /></span>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile Integrations Accordion */}
            <button
              onClick={() => setMobileIntegrationsOpen(!mobileIntegrationsOpen)}
              className="flex items-center justify-between py-4 text-lg font-bold text-zinc-700"
            >
              Integrations <ChevronDown size={18} className={`transition-transform ${mobileIntegrationsOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileIntegrationsOpen && (
              <div className="mb-2 flex flex-col gap-1 pl-2">
                {integrationItems.map((item) => (
                  <Link key={item.title} href={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600"><item.icon size={16} /></span>
                    {item.title}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile Pricing Accordion */}
            <button
              onClick={() => setMobilePricingOpen(!mobilePricingOpen)}
              className="flex items-center justify-between py-4 text-lg font-bold text-zinc-700"
            >
              Pricing <ChevronDown size={18} className={`transition-transform ${mobilePricingOpen ? "rotate-180" : ""}`} />
            </button>
            {mobilePricingOpen && (
              <div className="mb-2 flex flex-col gap-1 pl-2">
                {pricingItems.map((item) => (
                  <Link key={item.title} href={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600"><item.icon size={16} /></span>
                    <span>{item.title}</span>
                    <span className="ml-auto text-xs text-zinc-500">{item.price}</span>
                  </Link>
                ))}
              </div>
            )}

            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="py-4 text-lg font-bold text-zinc-700 transition hover:text-green-600"
              >
                {item.name}
              </Link>
            ))}

            <div className="mt-6 flex flex-col gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard/inbox"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-zinc-300 px-4 py-3 text-center font-bold text-lg"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { setIsOpen(false); logout(); }}
                    className="rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-lg text-white hover:bg-green-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-zinc-300 px-4 py-3 text-center font-bold text-lg"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-lg text-white hover:bg-green-700"
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
