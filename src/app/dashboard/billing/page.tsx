"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard, Zap, Users, MessageSquare, Bot, FileText,
  CheckCircle, XCircle, AlertCircle, Download, Crown,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  contactsLimit: number;
  messagesLimit: number;
  aiLimit: number;
  teamLimit: number;
}

interface Subscription {
  id: string;
  status: string;
  nextBillingDate: string | null;
  plan: Plan;
}

interface Usage {
  contacts: number;
  messages: number;
  aiUsed: number;
  teamMembers: number;
  plan: Plan | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  createdAt: string;
  pdfUrl?: string | null;
  subscription: { plan: Plan };
}

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">
          {limit === -1 ? `${used.toLocaleString()} / Unlimited` : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export default function BillingPage() {
  const { token } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const headers = { "Content-Type": "application/json" };

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch("/api/billing/subscription", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/billing/usage", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/plans", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/billing/invoices", { credentials: "include" }).then((r) => r.json()),
    ]).then(([sub, use, pl, inv]) => {
      setSubscription(sub.subscription ?? null);
      setUsage(use);
      setPlans(pl.plans ?? []);
      setInvoices(inv.invoices ?? []);
      setLoading(false);
    });
  }, [token]);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    const res = await fetch("/api/billing/upgrade", {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ planId }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) { alert(data.error ?? "Upgrade failed. Please try again."); setUpgrading(null); return; }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "Wexa AI",
        description: `${data.planName} Plan`,
        handler: () => {
          alert("Payment successful! Your plan will be updated shortly.");
          window.location.reload();
        },
        theme: { color: "#16a34a" },
      });
      rzp.open();
    };
    document.body.appendChild(script);
    setUpgrading(null);
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    setCancelling(true);
    await fetch("/api/billing/cancel", { method: "PATCH", credentials: "include", headers });
    setCancelling(false);
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const tabs = ["overview", "plans", "invoices"];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-sm text-gray-500">Manage your plan, usage, and invoices</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f0f2f5] p-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Current Plan</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    {subscription?.plan.name ?? "Free"}
                  </h2>
                  {subscription?.plan.price ? (
                    <p className="text-gray-500">₹{subscription.plan.price.toLocaleString()}/month</p>
                  ) : (
                    <p className="text-gray-500">Free forever</p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      subscription?.status === "active"
                        ? "bg-green-100 text-green-700"
                        : subscription?.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {subscription?.status === "active" ? (
                      <CheckCircle size={12} />
                    ) : (
                      <XCircle size={12} />
                    )}
                    {subscription?.status ?? "No subscription"}
                  </span>
                  {subscription?.nextBillingDate && (
                    <p className="mt-1 text-xs text-gray-400">
                      Renews {new Date(subscription.nextBillingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setActiveTab("plans")}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Upgrade Plan
                </button>
                {subscription && subscription.status === "active" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancelling ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                )}
              </div>
            </div>

            {/* Usage */}
            {usage && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-gray-900">Monthly Usage</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <UsageBar
                    label="Contacts"
                    used={usage.contacts}
                    limit={usage.plan?.contactsLimit ?? 100}
                  />
                  <UsageBar
                    label="Messages"
                    used={usage.messages}
                    limit={usage.plan?.messagesLimit ?? 500}
                  />
                  <UsageBar
                    label="AI Credits"
                    used={usage.aiUsed}
                    limit={usage.plan?.aiLimit ?? 100}
                  />
                  <UsageBar
                    label="Team Members"
                    used={usage.teamMembers}
                    limit={usage.plan?.teamLimit ?? 1}
                  />
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: Users, label: "Contacts", value: usage?.contacts ?? 0, color: "text-blue-600 bg-blue-50" },
                { icon: MessageSquare, label: "Messages", value: usage?.messages ?? 0, color: "text-green-600 bg-green-50" },
                { icon: Bot, label: "AI Credits", value: usage?.aiUsed ?? 0, color: "text-purple-600 bg-purple-50" },
                { icon: Users, label: "Team", value: usage?.teamMembers ?? 0, color: "text-orange-600 bg-orange-50" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{label} used</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLANS TAB */}
        {activeTab === "plans" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Choose the plan that fits your business</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const isCurrent = subscription?.plan.id === plan.id;
                const isEnterprise = plan.price === 0 && plan.name !== "Free";
                const isPro = plan.name === "Professional";
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border bg-white p-5 ${
                      isPro ? "border-green-500 ring-2 ring-green-500" : "border-gray-200"
                    }`}
                  >
                    {isPro && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-3 py-0.5 text-xs font-semibold text-white">
                        Most Popular
                      </span>
                    )}
                    <div className="mb-1 flex items-center gap-2">
                      <Crown size={14} className={isPro ? "text-green-600" : "text-gray-400"} />
                      <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    </div>
                    <div className="mb-4">
                      {isEnterprise ? (
                        <p className="text-2xl font-bold text-gray-900">Custom</p>
                      ) : (
                        <p className="text-2xl font-bold text-gray-900">
                          {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString()}`}
                          {plan.price > 0 && <span className="text-sm font-normal text-gray-400">/mo</span>}
                        </p>
                      )}
                    </div>
                    <ul className="mb-5 space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle size={13} className="text-green-500" />
                        {plan.contactsLimit === -1 ? "Unlimited" : plan.contactsLimit.toLocaleString()} Contacts
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={13} className="text-green-500" />
                        {plan.messagesLimit === -1 ? "Custom" : plan.messagesLimit.toLocaleString()} Messages
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={13} className="text-green-500" />
                        {plan.aiLimit === -1 ? "Unlimited" : plan.aiLimit.toLocaleString()} AI Credits
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle size={13} className="text-green-500" />
                        {plan.teamLimit === -1 ? "Unlimited" : plan.teamLimit} Team Members
                      </li>
                    </ul>
                    {isCurrent ? (
                      <div className="w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-semibold text-gray-500">
                        Current Plan
                      </div>
                    ) : isEnterprise ? (
                      <a
                        href="mailto:sales@wexa.ai"
                        className="block w-full rounded-lg border border-gray-300 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Contact Sales
                      </a>
                    ) : plan.price === 0 ? null : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={upgrading === plan.id}
                        className={`w-full rounded-lg py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                          isPro ? "bg-green-600 hover:bg-green-700" : "bg-gray-800 hover:bg-gray-900"
                        }`}
                      >
                        {upgrading === plan.id ? "Processing..." : "Upgrade"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Feature comparison */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Feature</th>
                    {["Free", "Starter", "Professional", "Enterprise"].map((n) => (
                      <th key={n} className="px-4 py-3 text-center font-semibold text-gray-700">{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["Broadcast", false, true, true, true],
                    ["AI Agent", false, "Basic", "Advanced", "Custom"],
                    ["Flows", "1", "10", "Unlimited", "Unlimited"],
                    ["API Access", false, false, true, true],
                  ].map(([feature, ...vals]) => (
                    <tr key={String(feature)}>
                      <td className="px-4 py-3 font-medium text-gray-700">{feature}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          {v === true ? (
                            <CheckCircle size={16} className="mx-auto text-green-500" />
                          ) : v === false ? (
                            <XCircle size={16} className="mx-auto text-gray-300" />
                          ) : (
                            <span className="text-gray-600">{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === "invoices" && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FileText size={40} className="mb-3 opacity-30" />
                <p className="font-medium">No invoices yet</p>
                <p className="text-sm">Invoices will appear here after your first payment</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Invoice</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.subscription.plan.name}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{inv.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {inv.status === "paid" ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.pdfUrl ? (
                          <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-600 hover:underline">
                            <Download size={13} /> PDF
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
