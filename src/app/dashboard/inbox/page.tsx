"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, CheckCheck, Check, Clock, RefreshCw,
  MessageSquare, Phone, MoreVertical, Filter, Inbox,
  ChevronDown, Circle, Smile, Paperclip, ArrowLeft, X, LayoutTemplate,
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
  messageType: string;
  mediaUrl?: string | null;
  templateId?: string | null;
}

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  header?: string | null;
  headerType?: string | null;
  body: string;
  footer?: string | null;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[] | null;
}

function dateSeparator(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConvStatus | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sendError, setSendError] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");
  const [sendingTemplate, setSendingTemplate] = useState(false);
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
    setMobileView("chat");
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
      messageType: "text",
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

  const fetchTemplates = useCallback(async () => {
    const res = await authFetch("/api/templates?status=APPROVED");
    if (res.ok) {
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    }
  }, []);

  const handleSendTemplate = async (t: Template) => {
    if (!activeId || !activeConv || sendingTemplate) return;
    setSendingTemplate(true);
    setSendError("");
    const res = await authFetch(`/api/templates/${t.id}`, {
      method: "POST",
      body: JSON.stringify({ phone: activeConv.contactPhone }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSendError(data.error ?? "Failed to send template");
    } else {
      // Add optimistic template bubble
      const bubble: Message = {
        id: `tpl-${Date.now()}`,
        text: t.body,
        direction: "outbound",
        status: "sent",
        createdAt: new Date().toISOString(),
        from: "me",
        messageType: "template",
        mediaUrl: t.headerType === "IMAGE" ? (t.header ?? null) : null,
        templateId: t.id,
      };
      setMessages((prev) => [...prev, bubble]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId ? { ...c, lastMessage: t.body, lastMessageAt: new Date().toISOString() } : c
        )
      );
      setShowTemplates(false);
    }
    setSendingTemplate(false);
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

  // Group messages by date for separators
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const label = dateSeparator(msg.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.date === label) { last.msgs.push(msg); }
    else acc.push({ date: label, msgs: [msg] });
    return acc;
  }, []);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#f0f2f5]">
      {/* Left Panel — Conversation List */}
      <div className={`flex w-full sm:w-72 md:w-80 min-h-0 flex-shrink-0 flex-col border-r border-gray-200 bg-white ${
        mobileView === "chat" ? "hidden md:flex" : "flex"
      }`}>
        {/* Header */}
        <div className="border-b border-gray-100 px-3 sm:px-4 py-3 sm:py-4">
          <div className="relative flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900">Inbox</h1>
            <div className="relative flex items-center gap-1">
              <button
                onClick={fetchConversations}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <RefreshCw size={16} className="sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setFilterOpen((open) => !open)}
                className={`rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 ${filterOpen ? "bg-gray-100 text-gray-700" : ""}`}
              >
                <Filter size={16} className="sm:w-4 sm:h-4" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-10 mt-2 w-40 sm:w-44 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                  <div className="space-y-1">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => {
                          setStatusFilter(tab.value);
                          setFilterOpen(false);
                        }}
                        className={`w-full rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm font-bold transition-colors ${
                          statusFilter === tab.value
                            ? "bg-green-50 text-green-700"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 sm:px-3 py-2">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm sm:text-base font-semibold outline-none placeholder:text-gray-400"
            />
          </div>

          {/* Status Tabs */}
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-lg px-2 sm:px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
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
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-3">
              <Inbox size={32} className="mb-3 text-gray-300 sm:w-9 sm:h-9" />
              <p className="text-sm sm:text-base font-bold text-gray-700">No conversations yet</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-gray-600">Messages from WhatsApp will appear here</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`flex w-full items-start gap-2 sm:gap-3 border-b border-gray-50 px-2 sm:px-4 py-2.5 sm:py-3.5 text-left transition-colors hover:bg-gray-50 ${
                  activeId === conv.id ? "bg-green-50 border-l-2 border-l-green-600" : ""
                }`}
              >
                {/* Avatar */}
                <div className={`flex h-9 sm:h-10 w-9 sm:w-10 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white ${avatarColor(conv.contactPhone)}`}>
                  {initials(conv)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`truncate text-sm sm:text-base ${conv.unreadCount > 0 ? "font-extrabold text-gray-900" : "font-bold text-gray-900"}`}>
                      {displayName(conv)}
                    </p>
                    <span className="ml-1 shrink-0 text-[10px] sm:text-[11px] text-gray-400">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <p className={`truncate text-xs sm:text-sm ${conv.unreadCount > 0 ? "font-bold text-gray-800" : "font-semibold text-gray-600"}`}>
                      {conv.lastMessage || "No messages yet"}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {conv.status !== "open" && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] sm:text-[10px] font-semibold whitespace-nowrap ${
                          conv.status === "resolved" ? "bg-gray-100 text-gray-500" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {conv.status}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[9px] sm:text-[10px] font-bold text-white">
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
        <div className={`flex flex-1 min-h-0 flex-col overflow-hidden ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}>
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-2 sm:px-4 py-2 sm:py-3 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden mr-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
              <div className={`flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white flex-shrink-0 ${avatarColor(activeConv.contactPhone)}`}>
                {initials(activeConv)}
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-extrabold text-gray-900 truncate">{displayName(activeConv)}</p>
                <p className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-gray-600">
                  <Phone size={10} className="sm:w-3 sm:h-3" /> {activeConv.contactPhone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Status Dropdown */}
              <div className="relative group">
                <button className={`flex items-center gap-1 rounded-lg border px-2 sm:px-3 py-1 text-xs sm:text-sm font-bold ${
                  activeConv.status === "open"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : activeConv.status === "resolved"
                    ? "border-gray-200 bg-gray-50 text-gray-600"
                    : "border-yellow-200 bg-yellow-50 text-yellow-700"
                }`}>
                  {activeConv.status} <ChevronDown size={12} className="hidden sm:block" />
                </button>
                <div className="absolute right-0 top-full z-10 mt-1 hidden w-32 sm:w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-lg group-hover:block">
                  {(["open", "pending", "resolved"] as ConvStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="flex w-full items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm capitalize text-gray-800 font-semibold hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <MoreVertical size={16} className="sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Messages — WhatsApp chat background */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 space-y-1"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8d6c8' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: "#e5ddd5",
            }}
          >
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare size={32} className="mb-3 text-gray-400 sm:w-8 sm:h-8" />
                <p className="text-sm sm:text-base font-bold text-gray-700">No messages in this conversation</p>
              </div>
            ) : (
              groupedMessages.map(({ date, msgs }) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-2 sm:my-3">
                    <span className="rounded-full bg-white/80 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] text-gray-500 shadow-sm">
                      {date}
                    </span>
                  </div>
                  {msgs.map((msg) => (
                    <div
                      key={msg.id}
                      className={`relative flex mb-0.5 sm:mb-1 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.messageType === "template" ? (
                        // WhatsApp template bubble with image + body + buttons
                        <div className={`max-w-xs sm:max-w-sm rounded-2xl ${msg.direction === "outbound" ? "rounded-tr-sm" : "rounded-tl-sm"} overflow-hidden shadow-sm bg-[#dcf8c6]`}>
                          {msg.mediaUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={msg.mediaUrl}
                              alt="header"
                              onClick={() => setSelectedImageUrl(msg.mediaUrl!)}
                              className="w-full max-h-[200px] object-cover cursor-pointer block"
                            />
                          )}
                          <div className="px-3 pt-2 pb-1">
                            <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap pr-10">{msg.text}</p>
                            <div className="flex justify-end items-center gap-1 mt-1">
                              <span className="text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </div>
                          {/* Template buttons */}
                          {(() => {
                            const tpl = templates.find((t) => t.id === msg.templateId);
                            return tpl?.buttons && tpl.buttons.length > 0 ? (
                              <div className="border-t border-[#b7e0a0]">
                                {tpl.buttons.map((b, i) => (
                                  <div key={i} className={`flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-[#00a884] bg-[#dcf8c6] ${
                                    i < tpl.buttons!.length - 1 ? "border-b border-[#b7e0a0]" : ""
                                  }`}>
                                    {b.type === "URL" && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    )}
                                    {b.type === "PHONE_NUMBER" && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    )}
                                    {b.type === "QUICK_REPLY" && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                                    )}
                                    {b.text}
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                      <div
                        className={`relative max-w-xs sm:max-w-sm shadow-sm overflow-hidden ${
                          msg.mediaUrl
                            ? "rounded-2xl p-0"
                            : msg.direction === "outbound"
                            ? "rounded-2xl rounded-tr-sm px-2 sm:px-3 py-1.5 sm:py-2"
                            : "rounded-2xl rounded-tl-sm px-2 sm:px-3 py-1.5 sm:py-2"
                        } ${
                          msg.direction === "outbound"
                            ? "bg-[#dcf8c6] text-gray-900"
                            : "bg-white text-gray-900"
                        }`}
                      >
                        {msg.mediaUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.mediaUrl}
                              alt="media"
                              onClick={() => setSelectedImageUrl(msg.mediaUrl!)}
                              className="w-full max-w-[200px] sm:max-w-[260px] max-h-[200px] sm:max-h-[260px] object-cover cursor-pointer block"
                            />
                            {msg.text && (
                              <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 pb-5 sm:pb-6">
                                <p className="text-sm sm:text-base font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              </div>
                            )}
                            <div className="absolute bottom-1 sm:bottom-1.5 right-2 sm:right-2.5 flex items-center gap-0.5 sm:gap-1">
                              <span className="text-[8px] sm:text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm sm:text-base font-semibold leading-relaxed pr-12 sm:pr-14 whitespace-pre-wrap">{msg.text}</p>
                            <div className="absolute bottom-1 sm:bottom-1.5 right-2 sm:right-2.5 flex items-center gap-0.5 sm:gap-1">
                              <span className="text-[8px] sm:text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </>
                        )}
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {selectedImageUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
              <div className="relative max-h-full w-full max-w-2xl sm:max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
                <button
                  onClick={() => setSelectedImageUrl(null)}
                  className="absolute right-2 sm:right-4 top-2 sm:top-4 z-10 inline-flex h-8 sm:h-10 w-8 sm:w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
                  aria-label="Close image preview"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedImageUrl} alt="Preview" className="max-h-[85vh] w-full object-contain" />
              </div>
            </div>
          )}

          {/* Template Picker */}
          {showTemplates && (
            <div className="bg-white border-t border-gray-200 shadow-lg max-h-80 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-700">Templates</span>
                <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              <div className="px-3 py-2 border-b border-gray-100">
                <input
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-green-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {templates
                  .filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase()))
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSendTemplate(t)}
                      disabled={sendingTemplate}
                      className="w-full text-left rounded-xl border border-gray-200 overflow-hidden hover:border-green-400 hover:shadow-sm transition disabled:opacity-60"
                    >
                      {/* WhatsApp-style preview */}
                      <div className="bg-[#e5ddd5] px-3 py-2">
                        <div className="ml-auto max-w-[85%] rounded-lg bg-white shadow-sm overflow-hidden">
                          {t.headerType === "IMAGE" && t.header ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.header} alt="header" className="w-full h-20 object-cover" />
                          ) : t.header ? (
                            <div className="px-2 pt-2 pb-0.5">
                              <p className="text-[11px] font-bold text-gray-800">{t.header}</p>
                            </div>
                          ) : null}
                          <div className="px-2 pt-1.5 pb-1">
                            <p className="text-[11px] text-gray-800 leading-relaxed line-clamp-3 whitespace-pre-line">{t.body}</p>
                          </div>
                          {t.footer && (
                            <div className="px-2 pb-1">
                              <p className="text-[10px] text-gray-400">{t.footer}</p>
                            </div>
                          )}
                          {t.buttons && t.buttons.length > 0 && (
                            <div className="border-t border-gray-100">
                              {t.buttons.map((b, i) => (
                                <div key={i} className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-[#00a884] ${i < t.buttons!.length - 1 ? "border-b border-gray-100" : ""}` }>
                                  {b.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-1.5 bg-white flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-700">{t.name}</span>
                        <span className="text-[10px] text-gray-400">{t.category}</span>
                      </div>
                    </button>
                  ))}
                {templates.filter((t) => t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">No approved templates found</p>
                )}
              </div>
            </div>
          )}

          {/* Reply Box */}
          <div className="bg-[#e5ddd5] px-2 sm:px-4 py-2 sm:py-3 border-t border-[#d6d6d6]">
            {sendError && (
              <p className="mb-2 text-[10px] sm:text-xs text-red-500 px-1">{sendError}</p>
            )}
            <div className="flex items-center gap-1 sm:gap-2 rounded-full bg-white px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm border border-gray-200">
              <button className="shrink-0 text-gray-500 hover:text-gray-700 p-1.5 sm:p-2 rounded-full transition-colors hover:bg-gray-100">
                <Smile size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={() => { setShowTemplates((v) => !v); if (!templates.length) fetchTemplates(); }}
                className={`shrink-0 p-1.5 sm:p-2 rounded-full transition-colors hover:bg-gray-100 ${
                  showTemplates ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-gray-700"
                }`}
                title="Send Template"
              >
                <LayoutTemplate size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button className="shrink-0 text-gray-500 hover:text-gray-700 p-1.5 sm:p-2 rounded-full transition-colors hover:bg-gray-100">
                <Paperclip size={18} className="sm:w-5 sm:h-5" />
              </button>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                placeholder="Type a message"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm sm:text-base font-semibold outline-none placeholder:text-gray-400"
                style={{ maxHeight: "140px" }}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || sending}
                className="flex h-8 sm:h-10 w-8 sm:w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {sending ? (
                  <div className="h-3 sm:h-4 w-3 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send size={16} className="sm:w-4 sm:h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center px-4"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8d6c8' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: "#e5ddd5",
          }}
        >
          <div className="rounded-2xl bg-white/80 px-6 sm:px-8 py-4 sm:py-6 text-center shadow-sm">
            <MessageSquare size={36} className="mx-auto mb-2 sm:mb-3 text-green-600 sm:w-10 sm:h-10" />
            <p className="text-base sm:text-xl font-extrabold text-gray-900">Select a conversation</p>
            <p className="mt-1 text-sm sm:text-base font-semibold text-gray-700">Choose a conversation from the left to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
