"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Phone, Server, Zap, Layers, Settings, Search, ChevronRight, ShieldCheck, ExternalLink } from "lucide-react";

const scrollToIntegrations = () => {
  document.getElementById("other-integrations")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const formatConnectedOn = (value?: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return `Connected on ${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
};

const initialCoreIntegrations = [
  {
    href: "/dashboard/integrations/whatsapp-cloud-api",
    name: "WhatsApp Cloud API",
    desc: "Connect your WhatsApp Business Account and start engaging.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
    connected: false,
    connectedAt: null,
  },
  {
    href: "/dashboard/integrations/meta-business-suite",
    name: "Meta Business Suite",
    desc: "Manage your business, messages and insights from Meta.",
    icon: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
    connected: false,
    connectedAt: null,
  },
  {
    href: "/dashboard/integrations/zapier",
    name: "Zapier",
    desc: "Automate workflows by connecting with 6,000+ apps.",
    icon: "https://cdn.worldvectorlogo.com/logos/zapier-1.svg",
    connected: false,
    connectedAt: null,
  },
  {
    href: "/dashboard/integrations/make-integromat",
    name: "Make (Integromat)",
    desc: "Build advanced automation and connect multiple apps.",
    icon: "https://images.ctfassets.net/qqlj6g4ee76j/3C6e6YAtCVoiMEMFTslTeU/0b9afb3d4b8e2f3e3e3e3e3e/make-logo.svg",
    connected: false,
    connectedAt: null,
  },
];

const categories = ["All", "CRM", "Marketing", "E-commerce", "Support", "Productivity", "Payment"];

const otherIntegrations = [
  { name: "Slack", desc: "Get real-time notifications and stay updated in your channels.", icon: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg", category: "Productivity" },
  { name: "Google Sheets", desc: "Sync contacts, leads and data automatically.", icon: "https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg", category: "Productivity" },
  { name: "HubSpot", desc: "Sync contacts and automate customer conversations.", icon: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png", category: "CRM" },
  { name: "Pipedrive", desc: "Manage leads and deals from WhatsApp conversations.", icon: "https://cdn.worldvectorlogo.com/logos/pipedrive.svg", category: "CRM" },
  { name: "Shopify", desc: "Send order updates and manage customers on WhatsApp.", icon: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg", category: "E-commerce" },
  { name: "WooCommerce", desc: "Notify customers and sync orders from your store.", icon: "https://upload.wikimedia.org/wikipedia/commons/2/2a/WooCommerce_logo.svg", category: "E-commerce" },
  { name: "Zoho CRM", desc: "Sync leads and automate follow-ups with Zoho CRM.", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Zoho_logo.svg", category: "CRM" },
  { name: "Zendesk", desc: "Create tickets and manage support from WhatsApp.", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Zendesk_logo.svg", category: "Support" },
];

function IntegrationIcon({ src, name, fallbackIcon: FallbackIcon }: { src: string; name: string; fallbackIcon?: React.ElementType }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 overflow-hidden border border-gray-100">
      <img src={src} alt={name} className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
}

export default function IntegrationsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [coreIntegrations, setCoreIntegrations] = useState(initialCoreIntegrations);

  useEffect(() => {
    let isMounted = true;

    const loadIntegrationStatus = async () => {
      try {
        const res = await fetch("/api/integrations/whatsapp", { credentials: "include" });
        if (!res.ok) return;

        const data = await res.json();
        if (!isMounted) return;

        if (data?.id) {
          setCoreIntegrations((prev) =>
            prev.map((item) =>
              item.href === "/dashboard/integrations/whatsapp-cloud-api"
                ? {
                    ...item,
                    connected: data.status === "active",
                    connectedAt: data.createdAt ?? null,
                  }
                : item
            )
          );
        }
      } catch (error) {
        console.error("Failed to load integration status", error);
      }
    };

    loadIntegrationStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = otherIntegrations.filter((i) => {
    const matchCat = activeCategory === "All" || i.category === activeCategory;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">Connect your favorite tools and automate your workflow.</p>
      </div>

      {/* Hero Banner */}
      <div className="relative mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white p-8">
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-gray-900">Connect. Automate. Grow.</h2>
          <p className="mt-2 text-sm text-gray-500">
            Integrate Wexa AI with the tools you already use.<br />Sync data, automate workflows and save time.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={scrollToIntegrations}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Browse Integrations
            </button>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span className="font-mono text-xs">&lt;/&gt;</span> View API Docs
            </a>
          </div>
        </div>
        {/* Decorative icons */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden md:block">
          <div className="relative h-40 w-64">
            <div className="absolute left-0 top-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md border border-gray-100">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" className="h-7 w-7" alt="Slack" />
            </div>
            <div className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md border border-gray-100">
              <Zap size={22} className="text-orange-500" />
            </div>
            <div className="absolute left-8 bottom-0 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md border border-gray-100">
              <Layers size={22} className="text-blue-500" />
            </div>
            <div className="absolute right-4 bottom-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md border border-gray-100">
              <Phone size={22} className="text-green-600" />
            </div>
            {/* Center bot icon */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-lg">
              <span className="text-2xl">🤖</span>
            </div>
            {/* Dashed lines */}
            <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
              <line x1="48" y1="28" x2="128" y2="80" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="216" y1="24" x2="128" y2="80" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="56" y1="152" x2="128" y2="80" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="196" y1="136" x2="128" y2="80" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Core Integrations */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Core Integrations</h2>
          <button className="flex items-center gap-1 text-sm font-medium text-green-600 hover:underline">
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {coreIntegrations.map((item) => {
            const status = item.connected ? "Connected" : "Coming Soon";
            const connectedOn = item.connected ? formatConnectedOn(item.connectedAt) : null;

            return (
              <div key={item.name} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                      <img src={item.icon} alt={item.name} className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${status === "Connected" ? "bg-green-50 text-green-700" : status === "Coming Soon" ? "bg-amber-50 text-amber-700" : "text-gray-500"}`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  {connectedOn ? (
                    <p className="text-xs text-gray-400">{connectedOn}</p>
                  ) : (
                    <Link href={item.href} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      Connect
                    </Link>
                  )}
                  <div className="flex items-center gap-2">
                    {connectedOn && (
                      <button className="text-gray-400 hover:text-gray-600">
                        <Settings size={15} />
                      </button>
                    )}
                    <Link href={item.href} className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Other Integrations */}
      <section id="other-integrations" className="mb-8">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Other Integrations</h2>
        <p className="mb-4 text-sm text-gray-500">All popular CRMs, marketing, and analytics integrations.</p>

        {/* Filters + Search */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
              <Search size={14} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations..."
                className="w-40 text-sm outline-none placeholder:text-gray-400"
              />
            </div>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 outline-none">
              <option>Sort by: Popular</option>
              <option>Sort by: Name</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                  <img src={item.icon} alt={item.name} className="h-6 w-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500 leading-snug">{item.desc}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Banner */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-green-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Secure &amp; Reliable</p>
            <p className="text-xs text-gray-500">All integrations are secure and your data is always protected with enterprise-grade encryption.</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-green-600 hover:underline whitespace-nowrap">
          Learn more about security <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
