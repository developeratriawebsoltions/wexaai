"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, Send, CheckCheck, Check, Clock, RefreshCw,
  MessageSquare, Phone, MoreVertical, Filter, Inbox,
  ChevronDown, Circle, Smile, Paperclip, ArrowLeft, X, LayoutTemplate, Upload,
  StickyNote, Zap, UserCheck, Trash2, PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
type ConvFilter = ConvStatus | "all" | "mine";
type RightTab = "notes" | "quickreplies" | "assign";

interface Note {
  id: string;
  text: string;
  userName: string;
  createdAt: string;
}

interface QuickReply {
  id: string;
  title: string;
  message: string;
}

interface Member {
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Conversation {
  id: string;
  contactId: string;
  contactPhone: string;
  contactName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: ConvStatus;
  assignedTo: string | null;
}

interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
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
  templateButtons?: TemplateButton[] | null;
  metadata?: TemplateButton[] | null;
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

const STATUS_TABS: { label: string; value: ConvFilter }[] = [
  { label: "All", value: "all" },
  { label: "Mine", value: "mine" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
];

export default function InboxPage() {
  const { user, workspace } = useAuth();
  const role = workspace?.role ?? "agent";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConvFilter>("all");

  // Default agents to "Mine" tab on first load
  useEffect(() => {
    if (role === "agent") setStatusFilter("mine");
  }, [role]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sendError, setSendError] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [sendingTemplate, setSendingTemplate] = useState(false);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [templateHeaderUrls, setTemplateHeaderUrls] = useState<Record<string, string>>({});
  const uploadTemplateFileRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Right panel
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [qrSearch, setQrSearch] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Fetch workspace id once
  useEffect(() => {
    authFetch("/api/workspace").then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        if (data[0]?.id) setWorkspaceId(data[0].id);
      }
    });
  }, []);

  const fetchNotes = useCallback(async (id: string) => {
    const r = await authFetch(`/api/inbox/conversations/${id}/notes`);
    if (r.ok) setNotes(await r.json());
  }, []);

  const fetchQuickReplies = useCallback(async () => {
    const r = await authFetch("/api/quick-replies");
    if (r.ok) setQuickReplies(await r.json());
  }, []);

  const fetchMembers = useCallback(async (wsId: string) => {
    const r = await authFetch(`/api/workspace/members?workspaceId=${wsId}`);
    if (r.ok) setMembers(await r.json());
  }, []);

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter === "mine") {
      params.set("mine", "true");
    } else if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }
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
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
      setActiveConv(data.conversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    }
    setLoadingMsgs(false);
  }, []);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!activeId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    const container = msgContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const res = await authFetch(`/api/inbox/conversations/${activeId}?cursor=${nextCursor}`);
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
      // Restore scroll position so user stays at same spot
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    }
    setLoadingOlder(false);
  }, [activeId, nextCursor, loadingOlder]);

  // Open conversation
  const openConversation = (conv: Conversation) => {
    setActiveId(conv.id);
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setSendError("");
    setMobileView("chat");
    setNotes([]);
    setAssignedUserId(conv.assignedTo ?? null);
    fetchMessages(conv.id);
    fetchNotes(conv.id);
    fetchQuickReplies();
    if (workspaceId) fetchMembers(workspaceId);
  };

  // Fetch members when workspaceId becomes available and a conv is open
  useEffect(() => {
    if (workspaceId && activeId) fetchMembers(workspaceId);
  }, [workspaceId, activeId, fetchMembers]);

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

  const addNote = async () => {
    if (!noteText.trim() || !activeId || savingNote) return;
    setSavingNote(true);
    const r = await authFetch(`/api/inbox/conversations/${activeId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text: noteText.trim() }),
    });
    if (r.ok) {
      const note = await r.json();
      setNotes((prev) => [...prev, note]);
      setNoteText("");
    }
    setSavingNote(false);
  };

  const deleteNote = async (noteId: string) => {
    if (!activeId) return;
    await authFetch(`/api/inbox/conversations/${activeId}/notes?noteId=${noteId}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const assignConversation = async (userId: string | null) => {
    if (!activeId || assigning) return;
    setAssigning(true);
    await authFetch(`/api/inbox/conversations/${activeId}`, {
      method: "PATCH",
      body: JSON.stringify({ assignedUserId: userId }),
    });
    setAssignedUserId(userId);
    setAssigning(false);
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
    const headerUrl = t.headerType === "IMAGE" ? (templateHeaderUrls[t.id] ?? t.header ?? "") : "";
    if (t.headerType === "IMAGE" && !headerUrl) {
      setSendError("Upload an image before sending this template.");
      return;
    }

    setSendingTemplate(true);
    setSendError("");
    const res = await authFetch(`/api/templates/${t.id}`, {
      method: "POST",
      body: JSON.stringify({
        contactId: activeConv.contactId,
        headerUrl: t.headerType === "IMAGE" ? headerUrl : undefined,
      }),
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
        mediaUrl: t.headerType === "IMAGE" ? (headerUrl || null) : null,
        templateButtons: t.buttons ?? null,
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

  const handleUploadTemplateImage = async (file: File, templateId: string) => {
    if (!activeId || !file) return;
    setUploadingTemplateId(templateId);
    setSendError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setTemplateHeaderUrls((prev) => ({ ...prev, [templateId]: data.url ?? "" }));
    } catch (err: any) {
      setSendError(err?.message ?? "Upload failed");
    } finally {
      setUploadingTemplateId(null);
    }
  };

  const emojiList = ["😀","😃","😄","😁","😆","😊","😇","🙂","🙃","😉","😍","😘","😜","🤔","😴","🤖","👍","👎","👏","🙏","🔥","🎉","❤️"];

  const handleSelectEmoji = (e: string) => {
    setReplyText((prev) => prev + e);
    setShowEmojiPicker(false);
  };

  const uploadMedia = async (file: File) => {
    if (!activeId) return;
    setSendError("");
    // optimistic UI
    const objUrl = URL.createObjectURL(file);
    const optimistic: Message = {
      id: `media-opt-${Date.now()}`,
      text: file.name,
      direction: "outbound",
      status: "sending",
      createdAt: new Date().toISOString(),
      from: "me",
      messageType: "media",
      mediaUrl: objUrl,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/inbox/conversations/${activeId}/media`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "Failed to upload");
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, status: "failed" } : m)));
      } else {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...data, direction: "outbound" } : m)));
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: file.name, lastMessageAt: new Date().toISOString() } : c)));
      }
    } catch (err: any) {
      setSendError(err?.message ?? "Upload failed");
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, status: "failed" } : m)));
    }
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
      <div className={`flex w-full sm:w-96 md:w-[420px] min-h-0 flex-shrink-0 flex-col border-r border-gray-200 bg-white ${
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
        <div className={`flex flex-1 min-h-0 overflow-hidden ${
          mobileView === "list" ? "hidden md:flex" : "flex"
        }`}>
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
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
              <button
                onClick={() => setRightPanelOpen((v) => !v)}
                className={`rounded-lg p-1.5 hover:bg-gray-100 ${ rightPanelOpen ? "text-green-600 bg-green-50" : "text-gray-400" }`}
                title="Notes / Quick Replies / Assign"
              >
                {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              </button>
            </div>
          </div>

          {/* Messages — WhatsApp chat background */}
          <div
            ref={msgContainerRef}
            className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 space-y-1"
            style={{
              backgroundColor: "#f5f0e8",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cg fill='none' stroke='%23c8b89a' stroke-width='1.2' opacity='0.45'%3E%3C!-- Globe 1 --%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3Cellipse cx='40' cy='40' rx='7' ry='14'/%3E%3Cline x1='26' y1='40' x2='54' y2='40'/%3E%3Cline x1='28' y1='33' x2='52' y2='33'/%3E%3Cline x1='28' y1='47' x2='52' y2='47'/%3E%3C!-- Mail 1 --%3E%3Crect x='70' y='55' width='28' height='20' rx='2'/%3E%3Cpolyline points='70,55 84,68 98,55'/%3E%3C!-- Chat bubble 1 --%3E%3Crect x='120' y='25' width='32' height='22' rx='6'/%3E%3Cpolygon points='126,47 122,56 134,47'/%3E%3Ccircle cx='132' cy='36' r='1.5'/%3E%3Ccircle cx='140' cy='36' r='1.5'/%3E%3Ccircle cx='148' cy='36' r='1.5'/%3E%3C!-- Thumbs up --%3E%3Cpath d='M180 55 Q183 45 190 44 L190 65 L175 65 L175 55 Z'/%3E%3Crect x='170' y='55' width='6' height='10' rx='1'/%3E%3C!-- Music note 1 --%3E%3Cpath d='M220 30 L220 50 Q218 53 215 52 Q212 51 213 48 Q214 45 217 46 L217 35 L228 32 L228 46 Q226 49 223 48 Q220 47 221 44 Q222 41 225 42'/%3E%3C!-- Dollar/coin --%3E%3Ccircle cx='260' cy='40' r='14'/%3E%3Ctext x='256' y='45' font-size='14' fill='%23c8b89a' stroke='none'%3E%24%3C/text%3E%3C!-- Gift box --%3E%3Crect x='290' y='45' width='26' height='20' rx='2'/%3E%3Crect x='288' y='40' width='30' height='7' rx='2'/%3E%3Cline x1='303' y1='40' x2='303' y2='65'/%3E%3Cpath d='M303 40 Q298 33 294 36 Q290 39 303 40'/%3E%3Cpath d='M303 40 Q308 33 312 36 Q316 39 303 40'/%3E%3C!-- Laptop --%3E%3Crect x='330' y='35' width='40' height='26' rx='3'/%3E%3Cline x1='320' y1='61' x2='380' y2='61'/%3E%3Crect x='338' y='41' width='24' height='14' rx='1'/%3E%3C!-- Wifi --%3E%3Carc cx='50' cy='130' r='5'/%3E%3Cpath d='M38 122 Q50 112 62 122'/%3E%3Cpath d='M33 117 Q50 104 67 117'/%3E%3Ccircle cx='50' cy='130' r='3'/%3E%3C!-- Search --%3E%3Ccircle cx='100' cy='120' r='10'/%3E%3Cline x1='107' y1='127' x2='116' y2='136'/%3E%3C!-- Globe 2 --%3E%3Ccircle cx='160' cy='130' r='14'/%3E%3Cellipse cx='160' cy='130' rx='7' ry='14'/%3E%3Cline x1='146' y1='130' x2='174' y2='130'/%3E%3Cline x1='148' y1='123' x2='172' y2='123'/%3E%3Cline x1='148' y1='137' x2='172' y2='137'/%3E%3C!-- Chat bubble 2 (thought) --%3E%3Crect x='195' y='108' width='36' height='24' rx='8'/%3E%3Ccircle cx='200' cy='136' r='3'/%3E%3Ccircle cx='194' cy='142' r='2'/%3E%3C!-- Mail 2 --%3E%3Crect x='245' y='112' width='28' height='20' rx='2'/%3E%3Cpolyline points='245,112 259,125 273,112'/%3E%3C!-- RSS --%3E%3Ccircle cx='310' cy='145' r='3'/%3E%3Cpath d='M300 145 Q300 130 315 130'/%3E%3Cpath d='M295 145 Q295 122 318 122'/%3E%3C!-- Heart --%3E%3Cpath d='M355 118 Q355 110 363 110 Q371 110 371 118 Q371 125 355 133 Q339 125 339 118 Q339 110 347 110 Q355 110 355 118Z'/%3E%3C!-- Phone --%3E%3Cpath d='M30 195 Q28 185 35 183 L40 182 L44 192 L40 195 Q44 202 50 206 L53 202 L63 206 L62 211 Q60 218 50 216 Q35 210 30 195Z'/%3E%3C!-- Dollar 2 --%3E%3Ccircle cx='100' cy='210' r='14'/%3E%3Ctext x='96' y='215' font-size='14' fill='%23c8b89a' stroke='none'%3E%24%3C/text%3E%3C!-- Laptop 2 --%3E%3Crect x='130' y='195' width='40' height='26' rx='3'/%3E%3Cline x1='120' y1='221' x2='180' y2='221'/%3E%3Crect x='138' y='201' width='24' height='14' rx='1'/%3E%3C!-- Chat bubble 3 --%3E%3Crect x='190' y='195' width='32' height='22' rx='6'/%3E%3Cpolygon points='196,217 192,226 204,217'/%3E%3Ccircle cx='202' cy='206' r='1.5'/%3E%3Ccircle cx='210' cy='206' r='1.5'/%3E%3Ccircle cx='218' cy='206' r='1.5'/%3E%3C!-- Music note 2 --%3E%3Cpath d='M250 195 L250 215 Q248 218 245 217 Q242 216 243 213 Q244 210 247 211 L247 200 L258 197 L258 211 Q256 214 253 213 Q250 212 251 209 Q252 206 255 207'/%3E%3C!-- Globe 3 --%3E%3Ccircle cx='300' cy='210' r='14'/%3E%3Cellipse cx='300' cy='210' rx='7' ry='14'/%3E%3Cline x1='286' y1='210' x2='314' y2='210'/%3E%3Cline x1='288' y1='203' x2='312' y2='203'/%3E%3Cline x1='288' y1='217' x2='312' y2='217'/%3E%3C!-- Gift 2 --%3E%3Crect x='335' y='200' width='26' height='20' rx='2'/%3E%3Crect x='333' y='195' width='30' height='7' rx='2'/%3E%3Cline x1='348' y1='195' x2='348' y2='220'/%3E%3Cpath d='M348 195 Q343 188 339 191 Q335 194 348 195'/%3E%3Cpath d='M348 195 Q353 188 357 191 Q361 194 348 195'/%3E%3C!-- Warning/Alert --%3E%3Cpolygon points='60,290 45,315 75,315'/%3E%3Cline x1='60' y1='298' x2='60' y2='307'/%3E%3Ccircle cx='60' cy='311' r='1.5'/%3E%3C!-- Thumbs up 2 --%3E%3Cpath d='M110 295 Q113 285 120 284 L120 305 L105 305 L105 295 Z'/%3E%3Crect x='100' y='295' width='6' height='10' rx='1'/%3E%3C!-- Mail 3 --%3E%3Crect x='145' y='285' width='28' height='20' rx='2'/%3E%3Cpolyline points='145,285 159,298 173,285'/%3E%3C!-- Search 2 --%3E%3Ccircle cx='220' cy='295' r='10'/%3E%3Cline x1='227' y1='302' x2='236' y2='311'/%3E%3C!-- RSS 2 --%3E%3Ccircle cx='270' cy='315' r='3'/%3E%3Cpath d='M260 315 Q260 300 275 300'/%3E%3Cpath d='M255 315 Q255 292 278 292'/%3E%3C!-- Dollar 3 --%3E%3Ccircle cx='320' cy='300' r='14'/%3E%3Ctext x='316' y='305' font-size='14' fill='%23c8b89a' stroke='none'%3E%24%3C/text%3E%3C!-- Globe 4 --%3E%3Ccircle cx='370' cy='290' r='14'/%3E%3Cellipse cx='370' cy='290' rx='7' ry='14'/%3E%3Cline x1='356' y1='290' x2='384' y2='290'/%3E%3Cline x1='358' y1='283' x2='382' y2='283'/%3E%3Cline x1='358' y1='297' x2='382' y2='297'/%3E%3C!-- Chat bubble 4 --%3E%3Crect x='20' y='355' width='32' height='22' rx='6'/%3E%3Cpolygon points='26,377 22,386 34,377'/%3E%3Ccircle cx='32' cy='366' r='1.5'/%3E%3Ccircle cx='40' cy='366' r='1.5'/%3E%3Ccircle cx='48' cy='366' r='1.5'/%3E%3C!-- Music note 3 --%3E%3Cpath d='M80 355 L80 375 Q78 378 75 377 Q72 376 73 373 Q74 370 77 371 L77 360 L88 357 L88 371 Q86 374 83 373 Q80 372 81 369 Q82 366 85 367'/%3E%3C!-- Laptop 3 --%3E%3Crect x='110' y='355' width='40' height='26' rx='3'/%3E%3Cline x1='100' y1='381' x2='160' y2='381'/%3E%3Crect x='118' y='361' width='24' height='14' rx='1'/%3E%3C!-- Heart 2 --%3E%3Cpath d='M185 365 Q185 357 193 357 Q201 357 201 365 Q201 372 185 380 Q169 372 169 365 Q169 357 177 357 Q185 357 185 365Z'/%3E%3C!-- Gift 3 --%3E%3Crect x='215' y='360' width='26' height='20' rx='2'/%3E%3Crect x='213' y='355' width='30' height='7' rx='2'/%3E%3Cline x1='228' y1='355' x2='228' y2='380'/%3E%3Cpath d='M228 355 Q223 348 219 351 Q215 354 228 355'/%3E%3Cpath d='M228 355 Q233 348 237 351 Q241 354 228 355'/%3E%3C!-- Phone 2 --%3E%3Cpath d='M270 360 Q268 350 275 348 L280 347 L284 357 L280 360 Q284 367 290 371 L293 367 L303 371 L302 376 Q300 383 290 381 Q275 375 270 360Z'/%3E%3C!-- Wifi 2 --%3E%3Ccircle cx='340' cy='380' r='3'/%3E%3Cpath d='M328 372 Q340 362 352 372'/%3E%3Cpath d='M323 367 Q340 354 357 367'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "400px 400px",
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
              <>
              {/* Load older messages button */}
              {hasMore && (
                <div className="flex justify-center mb-2">
                  <button
                    onClick={loadOlderMessages}
                    disabled={loadingOlder}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    {loadingOlder ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {loadingOlder ? "Loading..." : "Load older messages"}
                  </button>
                </div>
              )}
              {groupedMessages.map(({ date, msgs }) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-2 sm:my-3">
                    <span className="rounded-full bg-white/80 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] text-gray-500 shadow-sm">
                      {date}
                    </span>
                  </div>
                  {msgs.map((msg) => {
                    // Normalize possible button sources: optimistic `templateButtons`, message `metadata` array,
                    // or metadata object with a `buttons` key coming from other systems.
                    const raw = (msg as any).templateButtons ?? msg.metadata;
                    let msgButtons: TemplateButton[] | null = null;
                    if (Array.isArray(raw)) msgButtons = raw as TemplateButton[];
                    else if (raw && typeof raw === "object" && Array.isArray((raw as any).buttons)) msgButtons = (raw as any).buttons;
                    else msgButtons = null;
                    // Only keep known button types (defensive): URL, PHONE_NUMBER, QUICK_REPLY
                    if (msgButtons && msgButtons.length) {
                      msgButtons = msgButtons.filter((b) => {
                        const t = (b.type ?? "").toString().toUpperCase();
                        return t === "URL" || t === "PHONE_NUMBER" || t === "QUICK_REPLY";
                      });
                      if (msgButtons.length === 0) msgButtons = null;
                    }
                    return (
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
                            <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap break-all pr-10">{msg.text}</p>
                            <div className="flex justify-end items-center gap-1 mt-1">
                              <span className="text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </div>
                          {/* Template buttons — normalized from various metadata shapes */}
                          {msgButtons?.length ? (
                            <div className="border-t border-[#b7e0a0]">
                              {msgButtons.map((b, i, arr) => (
                                <div key={i} className={`flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-[#00a884] bg-[#dcf8c6] ${i < arr.length - 1 ? "border-b border-[#b7e0a0]" : ""}`}>
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
                          ) : null}
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
                            {/* Template buttons for media messages (image templates) */}
                            {msgButtons?.length ? (
                              <div className="border-t border-gray-100">
                                {msgButtons.map((b, i) => (
                                  <div key={i} className={`flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-[#00a884] ${i < msgButtons!.length - 1 ? "border-b border-gray-100" : ""}`}>
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
                            ) : null}
                            <div className="absolute bottom-1 sm:bottom-1.5 right-2 sm:right-2.5 flex items-center gap-0.5 sm:gap-1">
                              <span className="text-[8px] sm:text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm sm:text-base font-semibold leading-relaxed pr-12 sm:pr-14 whitespace-pre-wrap break-all">{msg.text}</p>
                            <div className="absolute bottom-1 sm:bottom-1.5 right-2 sm:right-2.5 flex items-center gap-0.5 sm:gap-1">
                              <span className="text-[8px] sm:text-[10px] text-gray-500">{formatTime(msg.createdAt)}</span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </>
                        )}
                      </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
              </>
            )}
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



          {/* Reply Box */}
          <div className="bg-[#f0ebe0] px-2 sm:px-4 py-2 sm:py-3 border-t border-[#ddd5c5]">
            {sendError && (
              <p className="mb-2 text-[10px] sm:text-xs text-red-500 px-1">{sendError}</p>
            )}
            <div className="flex items-center gap-1 sm:gap-2 rounded-full bg-white px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm border border-gray-200">
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="shrink-0 text-gray-500 hover:text-gray-700 p-1.5 sm:p-2 rounded-full transition-colors hover:bg-gray-100"
                  title="Insert emoji"
                >
                  <Smile size={18} className="sm:w-5 sm:h-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-20 w-56 max-w-xs rounded-lg bg-white border border-gray-200 shadow-lg p-2 grid grid-cols-8 gap-1">
                    {emojiList.map((e) => (
                      <button key={e} onClick={() => handleSelectEmoji(e)} className="p-1 text-sm hover:bg-gray-100 rounded">{e}</button>
                    ))}
                  </div>
                )}
              </div>
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="shrink-0 text-gray-500 hover:text-gray-700 p-1.5 sm:p-2 rounded-full transition-colors hover:bg-gray-100"
                  title="Attach file"
                >
                  <Paperclip size={18} className="sm:w-5 sm:h-5" />
                </button>
                <input
                  ref={(el) => { fileRef.current = el; }}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMedia(f);
                    e.currentTarget.value = "";
                  }}
                />
              </>
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

        {/* Right Sidebar */}
        {rightPanelOpen && (
          <div className="hidden md:flex w-72 flex-shrink-0 flex-col border-l border-gray-200 bg-white overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(["notes", "quickreplies", "assign"] as RightTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    rightTab === tab ? "border-b-2 border-green-600 text-green-700" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "notes" ? "Notes" : tab === "quickreplies" ? "Quick Replies" : "Assign"}
                </button>
              ))}
            </div>

            {/* Notes Tab */}
            {rightTab === "notes" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {notes.length === 0 && (
                    <p className="text-center text-xs text-gray-400 mt-8">No notes yet</p>
                  )}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg bg-yellow-50 border border-yellow-100 px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-yellow-700">{n.userName}</span>
                        <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1 text-[10px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 p-3">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:border-yellow-400 resize-none"
                  />
                  <button
                    onClick={addNote}
                    disabled={savingNote || !noteText.trim()}
                    className="mt-2 w-full rounded-lg bg-yellow-500 py-1.5 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Add Note"}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Replies Tab */}
            {rightTab === "quickreplies" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1.5">
                    <Search size={12} className="text-gray-400" />
                    <input
                      value={qrSearch}
                      onChange={(e) => setQrSearch(e.target.value)}
                      placeholder="Search..."
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {quickReplies
                    .filter((r) => !qrSearch || r.title.toLowerCase().includes(qrSearch.toLowerCase()) || r.message.toLowerCase().includes(qrSearch.toLowerCase()))
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setReplyText(r.message); setRightPanelOpen(false); }}
                        className="w-full text-left rounded-lg border border-gray-100 px-3 py-2 hover:bg-green-50 hover:border-green-200 transition-colors"
                      >
                        <span className="block text-[11px] font-semibold text-green-700 mb-0.5">/{r.title}</span>
                        <span className="block text-xs text-gray-600 line-clamp-2">{r.message}</span>
                      </button>
                    ))}
                  {quickReplies.length === 0 && (
                    <p className="text-center text-xs text-gray-400 mt-8">No quick replies saved</p>
                  )}
                </div>
              </div>
            )}

            {/* Assign Tab */}
            {rightTab === "assign" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <p className="text-xs text-gray-500 mb-3">Assign this conversation to a team member</p>
                {/* Assign to self — quick button for agents */}
                {user && (
                  <button
                    onClick={() => assignConversation(user.id)}
                    disabled={assigning || assignedUserId === user.id}
                    className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors mb-2 ${
                      assignedUserId === user.id ? "border-green-300 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    <UserCheck size={13} /> {assignedUserId === user.id ? "Assigned to you" : "Assign to me"}
                  </button>
                )}
                <button
                  onClick={() => assignConversation(null)}
                  className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    assignedUserId === null ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <UserCheck size={13} /> Unassigned
                </button>
                {members.map((m) => (
                  <button
                    key={m.userId}
                    onClick={() => assignConversation(m.userId)}
                    disabled={assigning}
                    className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      assignedUserId === m.userId ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700">
                      {(m.user.name ?? m.user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate">{m.user.name ?? m.user.email}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{m.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      ) : (
        /* Empty State */
        <div
          className="hidden md:flex flex-1 flex-col items-center justify-center px-4"
          style={{
            backgroundColor: "#f5f0e8",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cg fill='none' stroke='%23c8b89a' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='40' cy='40' r='14'/%3E%3Cellipse cx='40' cy='40' rx='7' ry='14'/%3E%3Cline x1='26' y1='40' x2='54' y2='40'/%3E%3Cline x1='28' y1='33' x2='52' y2='33'/%3E%3Cline x1='28' y1='47' x2='52' y2='47'/%3E%3Crect x='70' y='55' width='28' height='20' rx='2'/%3E%3Cpolyline points='70,55 84,68 98,55'/%3E%3Crect x='120' y='25' width='32' height='22' rx='6'/%3E%3Cpolygon points='126,47 122,56 134,47'/%3E%3Ccircle cx='132' cy='36' r='1.5'/%3E%3Ccircle cx='140' cy='36' r='1.5'/%3E%3Ccircle cx='148' cy='36' r='1.5'/%3E%3Cpath d='M180 55 Q183 45 190 44 L190 65 L175 65 L175 55 Z'/%3E%3Crect x='170' y='55' width='6' height='10' rx='1'/%3E%3Ccircle cx='260' cy='40' r='14'/%3E%3Crect x='290' y='45' width='26' height='20' rx='2'/%3E%3Crect x='288' y='40' width='30' height='7' rx='2'/%3E%3Cline x1='303' y1='40' x2='303' y2='65'/%3E%3Crect x='330' y='35' width='40' height='26' rx='3'/%3E%3Cline x1='320' y1='61' x2='380' y2='61'/%3E%3Ccircle cx='50' cy='130' r='3'/%3E%3Cpath d='M38 122 Q50 112 62 122'/%3E%3Cpath d='M33 117 Q50 104 67 117'/%3E%3Ccircle cx='100' cy='120' r='10'/%3E%3Cline x1='107' y1='127' x2='116' y2='136'/%3E%3Ccircle cx='160' cy='130' r='14'/%3E%3Cellipse cx='160' cy='130' rx='7' ry='14'/%3E%3Cline x1='146' y1='130' x2='174' y2='130'/%3E%3Crect x='195' y='108' width='36' height='24' rx='8'/%3E%3Ccircle cx='310' cy='145' r='3'/%3E%3Cpath d='M300 145 Q300 130 315 130'/%3E%3Cpath d='M295 145 Q295 122 318 122'/%3E%3Cpath d='M355 118 Q355 110 363 110 Q371 110 371 118 Q371 125 355 133 Q339 125 339 118 Q339 110 347 110 Q355 110 355 118Z'/%3E%3Ccircle cx='100' cy='210' r='14'/%3E%3Crect x='130' y='195' width='40' height='26' rx='3'/%3E%3Cline x1='120' y1='221' x2='180' y2='221'/%3E%3Crect x='190' y='195' width='32' height='22' rx='6'/%3E%3Ccircle cx='202' cy='206' r='1.5'/%3E%3Ccircle cx='210' cy='206' r='1.5'/%3E%3Ccircle cx='218' cy='206' r='1.5'/%3E%3Ccircle cx='300' cy='210' r='14'/%3E%3Cellipse cx='300' cy='210' rx='7' ry='14'/%3E%3Cline x1='286' y1='210' x2='314' y2='210'/%3E%3Crect x='335' y='200' width='26' height='20' rx='2'/%3E%3Crect x='333' y='195' width='30' height='7' rx='2'/%3E%3Cline x1='348' y1='195' x2='348' y2='220'/%3E%3Cpolygon points='60,290 45,315 75,315'/%3E%3Cline x1='60' y1='298' x2='60' y2='307'/%3E%3Crect x='145' y='285' width='28' height='20' rx='2'/%3E%3Cpolyline points='145,285 159,298 173,285'/%3E%3Ccircle cx='220' cy='295' r='10'/%3E%3Cline x1='227' y1='302' x2='236' y2='311'/%3E%3Ccircle cx='270' cy='315' r='3'/%3E%3Cpath d='M260 315 Q260 300 275 300'/%3E%3Ccircle cx='320' cy='300' r='14'/%3E%3Ccircle cx='370' cy='290' r='14'/%3E%3Cellipse cx='370' cy='290' rx='7' ry='14'/%3E%3Cline x1='356' y1='290' x2='384' y2='290'/%3E%3Crect x='20' y='355' width='32' height='22' rx='6'/%3E%3Ccircle cx='32' cy='366' r='1.5'/%3E%3Ccircle cx='40' cy='366' r='1.5'/%3E%3Ccircle cx='48' cy='366' r='1.5'/%3E%3Crect x='110' y='355' width='40' height='26' rx='3'/%3E%3Cline x1='100' y1='381' x2='160' y2='381'/%3E%3Cpath d='M185 365 Q185 357 193 357 Q201 357 201 365 Q201 372 185 380 Q169 372 169 365 Q169 357 177 357 Q185 357 185 365Z'/%3E%3Crect x='215' y='360' width='26' height='20' rx='2'/%3E%3Crect x='213' y='355' width='30' height='7' rx='2'/%3E%3Cline x1='228' y1='355' x2='228' y2='380'/%3E%3Cpath d='M270 360 Q268 350 275 348 L280 347 L284 357 L280 360 Q284 367 290 371 L293 367 L303 371 L302 376 Q300 383 290 381 Q275 375 270 360Z'/%3E%3Ccircle cx='340' cy='380' r='3'/%3E%3Cpath d='M328 372 Q340 362 352 372'/%3E%3Cpath d='M323 367 Q340 354 357 367'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "400px 400px",
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
