"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, CheckCheck, Check, Clock, RefreshCw,
  MessageSquare, Phone, MoreVertical, Filter, Inbox,
  ChevronDown, Circle,
} from "lucide-react";

function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}

type ConvStatus = "open" | "resolved" | "pending";

interface Conversation {
  id: string;
  contactPhone: string;
  contactName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: ConvStatus;
}

interface Message {
  id: string;
  text: string;
  direction: "inbound" | "outbound";
  status: string;
  createdAt: string;
  from: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "sent") return <Check size={13} className="text-gray-400" />;
  if (status === "read") return <CheckCheck size={13} className="text-blue-500" />;
  if (status === "failed") return <Circle size={13} className="text-red-400" />;
  return <Clock size={13} className="text-gray-300" />;
}

const STATUS_TABS: { label: string; value: ConvStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
];

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConvStatus | "all">("all");
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await authFetch(`/api/inbox/conversations?${params}`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
    setLoadingConvs(false);
  }, [statusFilter, search]);

  useEffect(() => {
    setLoadingConvs(true);
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    const res = await authFetch(`/api/inbox/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
      setActiveConv(data.conversation);
      // Update unread in list
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    }
    setLoadingMsgs(false);
  }, []);

  // Open conversation
  const openConversation = (conv: Conversation) => {
    setActiveId(conv.id);
    setMessages([]);
    setSendError("");
    fetchMessages(conv.id);
  };

  // Poll for new messages every 5s when a conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeId) return;
    pollRef.current = setInterval(() => {
      fetchMessages(activeId, true);
      fetchConversations();
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeId, fetchMessages, fetchConversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleReply = async () => {
    if (!replyText.trim() || !activeId || sending) return;
    setSending(true);
    setSendError("");

    // Optimistic UI
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      text: replyText,
      direction: "outbound",
      status: "sending",
      createdAt: new Date().toISOString(),
      from: "me",
    };
    setMessages((prev) => [...prev, optimistic]);
    const sentText = replyText;
    setReplyText("");

    const res = await authFetch(`/api/inbox/conversations/${activeId}/reply`, {
      method: "POST",
      body: JSON.stringify({ text: sentText }),
    });

    const data = await res.json();

    if (!res.ok) {
      setSendError(data.error ?? "Failed to send");
      // Replace optimistic with failed
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, status: "failed" } : m))
      );
    } else {
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...data, direction: "outbound" } : m))
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, lastMessage: sentText, lastMessageAt: new Date().toISOString() } : c
        )
      );
    }
    setSending(false);
  };

  const handleStatusChange = async (status: ConvStatus) => {
    if (!activeId) return;
    await authFetch(`/api/inbox/conversations/${activeId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setActiveConv((prev) => prev ? { ...prev, status } : prev);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, status } : c))
    );
  };

  const displayName = (c: Conversation) => c.contactName ?? c.contactPhone;

  const initials = (c: Conversation) => {
    const name = c.contactName ?? c.contactPhone;
    return name.slice(0, 2).toUpperCase();
  };

  const avatarColor = (phone: string) => {
    const colors = ["bg-purple-500", "bg-blue-500", "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-indigo-500"];
    return colors[phone.charCodeAt(phone.length - 1) % colors.length];
  };

  return (
    <div className="flex h-full overflow-hidden bg-[#f0f2f5]">
      {/* Left Panel — Conversation List */}
      <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900">Inbox</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchConversations}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <RefreshCw size={15} />
              </button>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <Filter size={15} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Status Tabs */}
          <div className="mt-3 flex gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === tab.value
                    ? "bg-green-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox size={36} className="mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="mt-1 text-xs text-gray-400">Messages from WhatsApp will appear here</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
                  activeId === conv.id ? "bg-green-50 border-l-2 border-l-green-600" : ""
                }`}
              >
                {/* Avatar */}
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(conv.contactPhone)}`}>
                  {initials(conv)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`truncate text-sm ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                      {displayName(conv)}
                    </p>
                    <span className="ml-2 shrink-0 text-[11px] text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={`truncate text-xs ${conv.unreadCount > 0 ? "font-medium text-gray-700" : "text-gray-400"}`}>
                      {conv.lastMessage || "No messages yet"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {conv.status !== "open" && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          conv.status === "resolved" ? "bg-gray-100 text-gray-500" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {conv.status}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Chat View */}
      {activeId && activeConv ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(activeConv.contactPhone)}`}>
                {initials(activeConv)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{displayName(activeConv)}</p>
                <p className="flex items-center gap-1 text-xs text-gray-400">
                  <Phone size={11} /> {activeConv.contactPhone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status Dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  activeConv.status === "open"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : activeConv.status === "resolved"
                    ? "border-gray-200 bg-gray-50 text-gray-600"
                    : "border-yellow-200 bg-yellow-50 text-yellow-700"
                }`}>
                  {activeConv.status} <ChevronDown size={12} />
                </button>
                <div className="absolute right-0 top-full z-10 mt-1 hidden w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg group-hover:block">
                  {(["open", "pending", "resolved"] as ConvStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="flex w-full items-center px-3 py-2 text-xs capitalize text-gray-700 hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare size={32} className="mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No messages in this conversation</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.direction === "outbound"
                        ? "rounded-br-sm bg-green-600 text-white"
                        : "rounded-bl-sm bg-white text-gray-800 shadow-sm border border-gray-100"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 ${msg.direction === "outbound" ? "text-green-200" : "text-gray-400"}`}>
                      <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                      {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply Box */}
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            {sendError && (
              <p className="mb-2 text-xs text-red-500">{sendError}</p>
            )}
            <div className="flex items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-100">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-400"
                style={{ maxHeight: "120px" }}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-gray-400">
              Replying as WhatsApp Business · Messages sent via Meta Cloud API
            </p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f0f2f5]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <MessageSquare size={36} className="text-green-600" />
          </div>
          <p className="mt-4 text-base font-semibold text-gray-700">Select a conversation</p>
          <p className="mt-1 text-sm text-gray-400">Choose a conversation from the left to start chatting</p>
        </div>
      )}
    </div>
  );
}
