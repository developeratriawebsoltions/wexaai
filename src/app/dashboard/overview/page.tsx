"use client";

import { useEffect, useState } from "react";
import { Search, Bell, TrendingUp, TrendingDown, Bot, MessageSquare, Users, Zap } from "lucide-react";

type ChartDay = { label: string; inbound: number; outbound: number };
type OverviewData = {
  stats: {
    totalConversations: number;
    totalContacts: number;
    totalMessages: number;
    convChange: string;
    contactChange: string;
    msgChange: string;
  };
  aiAgent: {
    name: string;
    autoReply: boolean;
    model: string;
    knowledgeCount: number;
    needsAttention: number;
  };
  chartData: ChartDay[];
};

function authFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, credentials: "include" });
}

function isUp(change: string) {
  return !change.startsWith("-");
}

export default function DashboardOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    authFetch("/api/overview")
      .then((r) => r.json())
      .then((d) => d.stats && setData(d));
  }, []);

  const chart = data?.chartData ?? [];
  const maxVal = Math.max(...chart.flatMap((d) => [d.inbound, d.outbound]), 1);

  const stats = data
    ? [
        { label: "Total Conversations", value: data.stats.totalConversations.toLocaleString(), change: data.stats.convChange, icon: MessageSquare },
        { label: "New Contacts", value: data.stats.totalContacts.toLocaleString(), change: data.stats.contactChange, icon: Users },
        { label: "Messages Sent", value: data.stats.totalMessages.toLocaleString(), change: data.stats.msgChange, icon: Zap },
        { label: "AI Auto Reply", value: data.aiAgent.autoReply ? "ON" : "OFF", change: data.aiAgent.model, icon: Bot, noTrend: true },
      ]
    : [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search anything..." className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Bell size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Welcome back! 👋</h2>
            <p className="text-sm text-gray-500">Here's what's happening with your business — last 7 days.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {!data
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse h-24" />
              ))
            : stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <s.icon size={14} className="text-gray-300" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  {s.noTrend ? (
                    <p className="mt-1 text-xs text-gray-400">{s.change}</p>
                  ) : (
                    <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${isUp(s.change) ? "text-green-600" : "text-red-500"}`}>
                      {isUp(s.change) ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.change} vs last week
                    </p>
                  )}
                </div>
              ))}
        </div>

        <div className="grid grid-cols-[1fr_220px] gap-3">
          {/* Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Message Activity</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Incoming</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-400" />Outgoing</span>
              </div>
            </div>
            {chart.length === 0 ? (
              <div className="h-36 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <div className="relative h-36">
                <svg viewBox="0 0 420 110" className="h-full w-full" preserveAspectRatio="none">
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1="0" y1={i * 28} x2="420" y2={i * 28} stroke="#f3f4f6" strokeWidth="1" />
                  ))}
                  <polyline fill="none" stroke="#22c55e" strokeWidth="2"
                    points={chart.map((d, i) => `${i * 70},${100 - (d.inbound / maxVal) * 90}`).join(" ")} />
                  <polyline fill="none" stroke="#60a5fa" strokeWidth="2"
                    points={chart.map((d, i) => `${i * 70},${100 - (d.outbound / maxVal) * 90}`).join(" ")} />
                  {chart.map((d, i) => (
                    <circle key={i} cx={i * 70} cy={100 - (d.inbound / maxVal) * 90} r="3" fill="#22c55e" />
                  ))}
                  {chart.map((d, i) => (
                    <circle key={i} cx={i * 70} cy={100 - (d.outbound / maxVal) * 90} r="3" fill="#60a5fa" />
                  ))}
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400 px-1">
                  {chart.map((d) => <span key={d.label}>{d.label}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* AI Agent Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">AI Agent</p>
            {!data ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded bg-gray-100" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${data.aiAgent.autoReply ? "bg-green-50" : "bg-gray-100"}`}>
                    <Bot size={18} className={data.aiAgent.autoReply ? "text-green-600" : "text-gray-400"} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{data.aiAgent.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${data.aiAgent.autoReply ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                      <span className="text-[10px] text-gray-500">{data.aiAgent.autoReply ? "Auto Reply ON" : "Auto Reply OFF"}</span>
                    </div>
                  </div>
                </div>
                {[
                  { label: "Knowledge Entries", value: data.aiAgent.knowledgeCount },
                  { label: "Needs Attention", value: data.aiAgent.needsAttention },
                  { label: "Model", value: data.aiAgent.model },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Conversation Status</p>
            {!data ? (
              <div className="animate-pulse h-16 rounded bg-gray-100" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total (7d)", value: data.stats.totalConversations },
                  { label: "Needs Attention", value: data.aiAgent.needsAttention },
                  { label: "Contacts", value: data.stats.totalContacts },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Messages (7 days)</p>
            {!data ? (
              <div className="animate-pulse h-16 rounded bg-gray-100" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Messages", value: data.stats.totalMessages.toLocaleString(), change: data.stats.msgChange },
                  { label: "AI Replies", value: "—", change: "outbound from AI" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{item.value}</p>
                    <p className={`text-xs font-medium ${isUp(item.change) ? "text-green-600" : "text-gray-400"}`}>{item.change}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
