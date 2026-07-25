"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, TrendingUp, Target, Award, RefreshCw, Search, ChevronRight, Sparkles, Loader2, CalendarPlus } from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CRMContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  customFields: Record<string, unknown> | null;
  createdAt: string;
  conversations: { lastMessage: string; lastMessageAt: string; status: string }[];
}

const STAGES = [
  { key: "new",       label: "New Lead",  color: "bg-gray-100 text-gray-600",   dot: "bg-gray-400"   },
  { key: "contacted", label: "Contacted", color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500"   },
  { key: "qualified", label: "Qualified", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  { key: "demo",      label: "Demo Done", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { key: "won",       label: "Won ✓",     color: "bg-green-100 text-green-700", dot: "bg-green-500"  },
  { key: "lost",      label: "Lost",      color: "bg-red-100 text-red-700",     dot: "bg-red-400"    },
];

const AVATAR_COLORS = [
  "bg-orange-400","bg-purple-400","bg-blue-400",
  "bg-pink-400","bg-teal-400","bg-red-400","bg-indigo-400","bg-yellow-500",
];

function avatarColor(phone: string) {
  return AVATAR_COLORS[phone.charCodeAt(phone.length - 1) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getStage(contact: CRMContact): string {
  const cf = contact.customFields;
  if (cf && typeof cf === "object" && "stage" in cf) return String(cf.stage);
  if (contact.tags.includes("lead")) return "contacted";
  return "new";
}

function getLeadScore(contact: CRMContact): number {
  const cf = contact.customFields;
  if (cf && typeof cf === "object" && "leadScore" in cf) return Number(cf.leadScore);
  return 0;
}

function getIntent(contact: CRMContact): string {
  const cf = contact.customFields;
  if (cf && typeof cf === "object" && "intent" in cf) return String(cf.intent).replace(/_/g, " ");
  return "";
}

// ── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({
  contact,
  onStageChange,
  onQualify,
  qualifying,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  contact: CRMContact;
  onStageChange: (id: string, stage: string) => void;
  onQualify: (id: string) => void;
  qualifying: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const stage = getStage(contact);
  const score = getLeadScore(contact);
  const intent = getIntent(contact);
  const lastConv = contact.conversations[0];
  const stageInfo = STAGES.find((s) => s.key === stage);
  const cf = contact.customFields;
  const alreadyQualified = !!(cf && typeof cf === "object" && "qualifiedAt" in cf);
  const summary = cf && typeof cf === "object" && "leadSummary" in cf ? String(cf.leadSummary) : "";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-xl border border-gray-100 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all ${
        dragging ? "opacity-40 scale-95" : "hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(contact.phone)}` }>
            {initials(contact.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 break-words">{contact.name}</p>
            <p className="text-xs font-semibold text-gray-500">{contact.phone}</p>
          </div>
        </div>
        {score > 0 && (
          <span className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold ${
            score >= 8 ? "bg-green-100 text-green-700" :
            score >= 5 ? "bg-yellow-100 text-yellow-700" :
            "bg-gray-100 text-gray-500"
          }`}>
            {score}/10
          </span>
        )}
      </div>

      {/* Intent */}
      {intent && (
        <p className="mb-2 text-xs font-semibold text-purple-600 capitalize bg-purple-50 rounded-md px-2 py-0.5 inline-block">
          {intent}
        </p>
      )}

      {/* Last message */}
      {lastConv && (
        <p className="text-xs font-medium text-gray-500 break-words mb-2">
          {lastConv.lastMessage || "No messages yet"}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stageInfo?.color}`}>
          {stageInfo?.label}
        </span>
        <div className="flex items-center gap-1.5">
          {lastConv && (
            <span className="text-xs font-medium text-gray-400">{timeAgo(lastConv.lastMessageAt)}</span>
          )}
          <Link
            href={`/dashboard/contacts`}
            className="text-gray-300 hover:text-green-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* AI summary */}
      {summary && (
        <p className="mb-2 text-[11px] text-gray-400 italic line-clamp-2">{summary}</p>
      )}

      {/* Quick stage change */}
      <div className="mt-2 pt-2 border-t border-gray-50 flex flex-col gap-1.5">
        <select
          value={stage}
          onChange={(e) => onStageChange(contact.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 outline-none focus:border-green-300"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        {!alreadyQualified && (
          <button
            onClick={(e) => { e.stopPropagation(); onQualify(contact.id); }}
            disabled={qualifying}
            className="flex items-center justify-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-100 transition disabled:opacity-60"
          >
            {qualifying ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {qualifying ? "Qualifying..." : "Qualify with AI"}
          </button>
        )}
        <Link
          href={`/dashboard/bookings`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 transition"
        >
          <CalendarPlus size={10} /> Book Meeting
        </Link>
      </div>
    </div>
  );
}

// ── Stage Column ──────────────────────────────────────────────────────────────
function StageColumn({
  stage,
  contacts,
  onStageChange,
  onQualify,
  qualifyingId,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  stage: typeof STAGES[number];
  contacts: CRMContact[];
  onStageChange: (id: string, stage: string) => void;
  onQualify: (id: string) => void;
  qualifyingId: string | null;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (stage: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-colors min-w-[220px] w-[220px] flex-shrink-0 ${
        dragOver ? "border-green-400 bg-green-50" : "border-transparent bg-[#f0f2f5]"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop(stage.key); }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
          <span className="text-sm font-bold text-gray-700">{stage.label}</span>
        </div>
        <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs font-bold text-gray-500">
          {contacts.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-2 pb-3 flex-1 min-h-[120px]">
        {contacts.length === 0 ? (
          <div className={`flex items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs font-medium text-gray-300 ${
            dragOver ? "border-green-300" : "border-gray-200"
          }`}>
            Drop here
          </div>
        ) : (
          contacts.map((c) => (
            <LeadCard
              key={c.id}
              contact={c}
              onStageChange={onStageChange}
              onQualify={onQualify}
              qualifying={qualifyingId === c.id}
              dragging={draggingId === c.id}
              onDragStart={() => onDragStart(c.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main CRM Page ─────────────────────────────────────────────────────────────
export default function CRMPage() {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/crm", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const updateStage = async (contactId: string, stage: string) => {
    // Optimistic update
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, customFields: { ...(c.customFields ?? {}), stage } }
          : c
      )
    );
    await fetch("/api/crm", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, stage }),
    });
  };

  const handleDrop = (stage: string) => {
    if (draggingId) updateStage(draggingId, stage);
    setDraggingId(null);
  };

  const handleQualify = async (contactId: string) => {
    setQualifyingId(contactId);
    const res = await fetch("/api/leads/qualify", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    setQualifyingId(null);
    if (res.ok) fetchContacts();
  };

  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  // Stats
  const leads      = contacts.filter((c) => c.tags.includes("lead")).length;
  const qualified  = contacts.filter((c) => getStage(c) === "qualified").length;
  const won        = contacts.filter((c) => getStage(c) === "won").length;
  const convRate   = leads > 0 ? Math.round((won / leads) * 100) : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">CRM Pipeline</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={13} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-36 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={fetchContacts}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 px-6 py-3 flex-shrink-0">
        {[
          { icon: Users,     label: "Total Contacts", value: contacts.length, color: "text-blue-600"   },
          { icon: TrendingUp, label: "Leads",          value: leads,           color: "text-purple-600" },
          { icon: Target,    label: "Qualified",       value: qualified,       color: "text-yellow-600" },
          { icon: Award,     label: "Won",             value: won,             color: "text-green-600"  },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white border border-gray-100 px-4 py-2.5 shadow-sm">
            <Icon size={16} className={color} />
            <div>
              <p className="text-lg font-bold text-gray-800 leading-none">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2.5 rounded-xl bg-white border border-gray-100 px-4 py-2.5 shadow-sm">
          <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
            <span className="text-xs font-bold text-green-600">{convRate}%</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700">Conversion</p>
            <p className="text-[10px] text-gray-400">Won / Leads</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-6 pb-6">
          <div className="flex gap-3 h-full" style={{ minWidth: "max-content" }}>
            {STAGES.map((stage) => {
              const stageContacts = filtered.filter((c) => getStage(c) === stage.key);
              return (
                <StageColumn
                  key={stage.key}
                  stage={stage}
                  contacts={stageContacts}
                  onStageChange={updateStage}
                  onQualify={handleQualify}
                  qualifyingId={qualifyingId}
                  draggingId={draggingId}
                  onDragStart={setDraggingId}
                  onDragEnd={() => setDraggingId(null)}
                  onDrop={handleDrop}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
