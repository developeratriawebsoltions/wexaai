"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  SquarePen,
  Menu,
  UserPlus,
  Bookmark,
  Star,
  MoreVertical,
  Smile,
  Paperclip,
  Link2,
  Maximize2,
  Send,
  CheckCheck,
} from "lucide-react";

const conversations = [
  { id: 1, name: "Rahul Sharma", phone: "+91 98765 43210", message: "Hi, I want to know about...", time: "10:30 AM", unread: 2, avatar: "RS", color: "bg-orange-400" },
  { id: 2, name: "Priya Singh", phone: "+91 87654 32109", message: "Thanks for your help!", time: "10:24 AM", unread: 1, avatar: "PS", color: "bg-purple-400" },
  { id: 3, name: "Aman Verma", phone: "+91 76543 21098", message: "Price details please", time: "10:20 AM", unread: 0, avatar: "AV", color: "bg-blue-400" },
  { id: 4, name: "Neha Patel", phone: "+91 65432 10987", message: "How can I place an order?", time: "10:15 AM", unread: 3, avatar: "NP", color: "bg-pink-400" },
  { id: 5, name: "Rohit Kumar", phone: "+91 54321 09876", message: "Do you have COD?", time: "10:10 AM", unread: 1, avatar: "RK", color: "bg-teal-400" },
  { id: 6, name: "Anjali Mehta", phone: "+91 43210 98765", message: "Can I get a discount?", time: "09:58 AM", unread: 0, avatar: "AM", color: "bg-red-400" },
  { id: 7, name: "Vikram Joshi", phone: "+91 32109 87654", message: "Order status?", time: "09:45 AM", unread: 0, avatar: "VJ", color: "bg-indigo-400" },
  { id: 8, name: "Sneha Reddy", phone: "+91 21098 76543", message: "Is the product available?", time: "09:30 AM", unread: 0, avatar: "SR", color: "bg-yellow-500" },
];

const chatMessages = [
  { id: 1, from: "agent", text: "Hello Rahul 👋\nWelcome to Demo Business.\nHow can I help you today?", time: "10:30 AM" },
  { id: 2, from: "user", text: "I want to know about your products.", time: "10:31 AM" },
  { id: 3, from: "agent", text: "Sure! We deal in smart watches, earbuds,\nand premium accessories.\nWould you like to see our best sellers?", time: "10:31 AM" },
  { id: 4, from: "user", text: "Yes, showing me best sellers.", time: "10:32 AM" },
  {
    id: 5,
    from: "agent",
    text: "🔥 Best Sellers\n1. Smart Watch Pro – ₹2,999\n2. Air Buds X – ₹1,499\n3. Neckband Z – ₹999\n\nYou can reply with the number to know more.",
    time: "10:37 AM",
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"reply" | "note">("reply");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(1);
  const selected = conversations.find((c) => c.id === selectedId)!;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation List Panel */}
      <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-700"><Menu size={18} /></button>
            <span className="text-[15px] font-semibold text-gray-800">All Conversations</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <button className="hover:text-gray-600"><Filter size={16} /></button>
            <button className="hover:text-gray-600"><SquarePen size={16} /></button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search contacts..." className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
            <Filter size={13} className="text-gray-400" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 px-3 pb-2 text-xs font-medium">
          {[
            { label: "All", count: 32 },
            { label: "Unread", count: 12 },
            { label: "Open", count: 8 },
            { label: "Closed", count: null },
          ].map(({ label, count }) => (
            <button
              key={label}
              onClick={() => setActiveFilter(label)}
              className={`rounded-full px-2.5 py-1 transition ${
                activeFilter === label
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}{count !== null ? ` ${count}` : ""}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${selectedId === c.id ? "bg-green-50 border-l-2 border-green-600" : ""}`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${c.color}`}>
                {c.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                  <span className="text-[11px] text-gray-400">{c.time}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="truncate text-xs text-gray-500">{c.message}</p>
                  {c.unread > 0 && (
                    <span className="ml-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${selected.color}`}>
              {selected.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <UserPlus size={13} /> Assign to
            </button>
            <button className="hover:text-gray-600"><Bookmark size={16} /></button>
            <button className="hover:text-gray-600"><Star size={16} /></button>
            <button className="hover:text-gray-600"><MoreVertical size={16} /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ background: "#f0f2f5" }}>
          <div className="mb-4 text-center text-xs text-gray-400">Today</div>
          <div className="space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    msg.from === "agent"
                      ? "rounded-tr-sm bg-[#dcf8c6] text-gray-800"
                      : "rounded-tl-sm bg-white text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <div className={`mt-1 flex items-center gap-1 text-[11px] text-gray-400 ${msg.from === "agent" ? "justify-end" : "justify-start"}`}>
                    <span>{msg.time}</span>
                    {msg.from === "agent" && <CheckCheck size={13} className="text-blue-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reply Box */}
        <div className="border-t border-gray-200 bg-white">
          {/* Tabs */}
          <div className="flex items-center gap-4 border-b border-gray-100 px-4 pt-2">
            {(["reply", "note"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium capitalize transition ${
                  activeTab === tab
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2">
            <div className="flex items-center gap-3 text-gray-400">
              <button className="hover:text-gray-600"><Smile size={18} /></button>
              <button className="hover:text-gray-600"><Paperclip size={18} /></button>
              <button className="hover:text-gray-600"><Link2 size={18} /></button>
              <button className="hover:text-gray-600"><Maximize2 size={16} /></button>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              <Send size={14} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
