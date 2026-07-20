"use client";

import { useEffect, useState } from "react";
import { Search, Bell, TrendingUp, TrendingDown } from "lucide-react";

type ChartPoint = { label: string; inbound: number; outbound: number };
type ChannelMetric = { name: string; pct: number; color: string; count: number };
type AgentMetric = { id: string; name: string; conversations: number; resolution: string; rating: string };
type AnalyticsData = {
  stats: {
    totalConversations: number;
    totalContacts: number;
    totalMessages: number;
  };
  activeAgents: number;
  messagesByDirection: ChannelMetric[];
  topAgents: AgentMetric[];
  chartData: ChartPoint[];
};

const tabs = ["Overview", "Conversations", "Agents", "Broadcasts", "Customers"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/overview", { credentials: "include" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload?.stats) {
          setData(payload);
        }
      })
      .catch(() => {
        setData(null);
      });
  }, []);

  const dateRange = (() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return `${start.toLocaleDateString("en", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en", { month: "short", day: "numeric" })}`;
  })();

  const stats = data
    ? [
        { label: "Total Conversations", value: data.stats.totalConversations.toLocaleString(), change: "Last 7 days" },
        { label: "Messages Sent", value: data.stats.totalMessages.toLocaleString(), change: "Last 7 days" },
        { label: "New Contacts", value: data.stats.totalContacts.toLocaleString(), change: "Last 7 days" },
        { label: "Active Agents", value: data.activeAgents.toLocaleString(), change: "Current workspace" },
      ]
    : [];

  const chartDays = data?.chartData.map((point) => point.label) ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const chartValues = data?.chartData.map((point) => point.inbound) ?? [0, 0, 0, 0, 0, 0, 0];
  const allValues = data?.chartData.flatMap((point) => [point.inbound, point.outbound]) ?? [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...allValues, 100);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search anything..." className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Bell size={18} /></button>
          <span className="text-sm text-gray-400">{dateRange} ▾</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center gap-1 border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3">
          {tabs.map((t, i) => (
            <button key={t} className={`pb-2.5 px-3 text-xs font-medium transition border-b-2 ${i === 0 ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-3">
          {!data
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-xl border border-gray-200 bg-white p-4 animate-pulse" />
              ))
            : stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="mt-1 text-xs text-gray-500">{stat.change}</p>
                </div>
              ))}
        </div>

        <div className="grid grid-cols-[1fr_220px] gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Conversations Over Time</p>
            <div className="relative h-36">
              <svg viewBox="0 0 420 110" className="h-full w-full" preserveAspectRatio="none">
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1="0" y1={i * 28} x2="420" y2={i * 28} stroke="#f3f4f6" strokeWidth="1" />
                ))}
                <polyline
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  points={chartValues.map((value, index) => `${index * 60},${100 - (value / maxVal) * 90}`).join(" ")}
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-gray-400 px-1">
                {chartDays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-gray-800">Messages by Direction</p>
            <div className="flex flex-col items-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                  {data?.messagesByDirection.map((item, index) => {
                    const dash = `${item.pct} ${100 - item.pct}`;
                    const offset = index === 0 ? 0 : -data.messagesByDirection[0].pct;
                    return (
                      <circle
                        key={item.name}
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="3.5"
                        strokeDasharray={dash}
                        strokeDashoffset={offset}
                      />
                    );
                  })}
                </svg>
                <span className="absolute text-base font-bold text-gray-800">{data ? data.stats.totalConversations.toLocaleString() : "—"}</span>
              </div>
              <div className="mt-3 w-full space-y-1.5">
                {data?.messagesByDirection.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-medium text-gray-700">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-gray-800">Top Performing Agents</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400">
                <th className="py-2 text-left font-medium">No.</th>
                <th className="py-2 text-left font-medium">Name</th>
                <th className="py-2 text-left font-medium">Conversations</th>
                <th className="py-2 text-left font-medium">Resolution Rate</th>
                <th className="py-2 text-left font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {data
                ? data.topAgents.map((agent, index) => (
                    <tr key={agent.id} className="border-b border-gray-50">
                      <td className="py-2.5 text-gray-400 text-xs">{index + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                            {agent.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-700">{agent.conversations}</td>
                      <td className="py-2.5 text-green-600 font-medium">{agent.resolution}</td>
                      <td className="py-2.5 text-gray-700">{agent.rating}</td>
                    </tr>
                  ))
                : Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-b border-gray-50">
                      <td className="py-2.5 h-10 bg-gray-100" />
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
