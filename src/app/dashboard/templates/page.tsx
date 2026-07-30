"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, RefreshCw, Plus, X, Loader2, Send, Upload,
  Copy, MoreHorizontal, FileText, CheckCircle, Clock, XCircle, FileEdit,
  LayoutGrid, List, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  buttons?: any[] | null;
  rejectedReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string;
  flow_id?: string;
  flow_name?: string;
}

interface LocationDetails {
  latitude: string;
  longitude: string;
  name: string;
  address: string;
}

const STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  APPROVED: { badge: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", label: "Approved" },
  PENDING:  { badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Pending" },
  REJECTED: { badge: "bg-red-100 text-red-600 border-red-200",   dot: "bg-red-500",   label: "Rejected" },
  PAUSED:   { badge: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400",  label: "Paused" },
  DRAFT:    { badge: "bg-blue-100 text-blue-600 border-blue-200", dot: "bg-blue-400",  label: "Draft" },
};

const STATUS_TABS = [
  { key: "ALL",      label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING",  label: "Pending" },
  { key: "REJECTED", label: "Rejected" },
  { key: "DRAFT",    label: "Draft" },
];

const CATEGORY_CHIPS = ["All", "Marketing", "Utility", "Authentication", "Image", "Video", "Carousel", "Buttons"];

const HEADER_TYPES = ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION", "CATALOG", "CAROUSEL", "LTO", "MPM"];
const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const LANGUAGES = [
  { code: "en",    label: "English" },
  { code: "en_US", label: "English (US)" },
];

const DEFAULT_FORM = {
  name: "", category: "UTILITY", language: "en",
  header: "", headerType: "TEXT", body: "", footer: "",
  buttons: [] as TemplateButton[],
};

const DEFAULT_LOCATION_DETAILS: LocationDetails = {
  latitude: "",
  longitude: "",
  name: "",
  address: "",
};

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "Updated just now" : `Updated ${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours} hr${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days > 1 ? "s" : ""} ago`;
}

export default function TemplatesPage() {
  const { loading: authLoading, workspace } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [categoryChip, setCategoryChip] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bodyVarLabels, setBodyVarLabels] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Send modal state
  const [sendTemplate, setSendTemplate] = useState<Template | null>(null);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [bodyVars, setBodyVars] = useState<string[]>([]);
  const [headerUrl, setHeaderUrl] = useState("");
  const [locationDetails, setLocationDetails] = useState<LocationDetails>(DEFAULT_LOCATION_DETAILS);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const sendFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (search) params.set("search", search);
    const res = await fetch(`/api/templates?${params}`, { credentials: "include" });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setTemplates(list);
    if (list.length > 0) setPreviewTemplate(prev => prev ?? list[0]);
    setLoading(false);
  }, [tab, search]);

  useEffect(() => { if (!authLoading) fetchTemplates(); }, [authLoading, fetchTemplates]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const prefillRaw = searchParams.get("prefill");
      let prefill: Partial<typeof DEFAULT_FORM> = {};
      try { if (prefillRaw) prefill = JSON.parse(prefillRaw); } catch {}
      setShowModal(true); setError("");
      setForm({ ...DEFAULT_FORM, ...prefill });
      if (prefill.body) {
        const vars = [...new Set([...prefill.body.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]))];
        setBodyVarLabels(Object.fromEntries(vars.map(k => [k, ""])));
      } else { setBodyVarLabels({}); }
      setEditingId(null);
      router.replace("/dashboard/templates");
    }
  }, [searchParams, router]);

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/templates/sync", {
      method: "POST",
      credentials: "include",
      headers: workspace?.id ? { "x-workspace-id": workspace.id } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.code ? `${data.error} (code: ${data.code})` : (data.error ?? "Sync failed");
      alert(msg);
    }
    setSyncing(false);
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    await fetch(`/api/templates/${id}`, { method: "DELETE", credentials: "include" });
    setDeletingId(null);
    setTemplates(t => t.filter(x => x.id !== id));
  }

  function parseLocationDetails(value?: string | null): LocationDetails {
    if (!value) return { ...DEFAULT_LOCATION_DETAILS };
    try {
      const parsed = JSON.parse(value);
      return {
        latitude: parsed.latitude ?? "",
        longitude: parsed.longitude ?? "",
        name: parsed.name ?? "",
        address: parsed.address ?? "",
      };
    } catch {
      return { ...DEFAULT_LOCATION_DETAILS };
    }
  }

  function buildHeaderValue(headerType: string, header: string) {
    if (headerType === "LOCATION") {
      const payload = {
        latitude: locationDetails.latitude.trim(),
        longitude: locationDetails.longitude.trim(),
        name: locationDetails.name.trim(),
        address: locationDetails.address.trim(),
      };
      const hasValue = Object.values(payload).some(Boolean);
      return hasValue ? JSON.stringify(payload) : undefined;
    }
    return header.trim() || undefined;
  }

  async function handleCreate(e: React.FormEvent) {
    e?.preventDefault();
    setCreating(true); setError("");
    const trimmedBody = form.body.trim();
    if (/^\{\{\d+\}\}/.test(trimmedBody)) {
      setError("Body cannot start with a variable like {{1}}. Add some text before it.");
      setCreating(false); return;
    }
    if (/\{\{\d+\}\}$/.test(trimmedBody)) {
      setError("Body cannot end with a variable like {{1}}. Add some text after it.");
      setCreating(false); return;
    }
    const payload = {
      ...form,
      header: buildHeaderValue(form.headerType, form.header),
      footer: form.footer || undefined,
      buttons: form.buttons.length ? form.buttons : undefined,
      bodyExamples: Object.keys(bodyVarLabels).length
        ? Object.keys(bodyVarLabels).sort().map(k => bodyVarLabels[k] || `{{${k}}}`)
        : undefined,
    };
    let res: Response;
    if (editingId) {
      res = await fetch(`/api/templates/${editingId}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/templates", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error ?? (editingId ? "Failed to update" : "Failed to create")); return; }
    setShowModal(false); setForm(DEFAULT_FORM); setLocationDetails(DEFAULT_LOCATION_DETAILS); setEditingId(null); setBodyVarLabels({});
    fetchTemplates();
  }

  function openEditModal(t: Template) {
    setError(""); setEditingId(t.id);
    setForm({ name: t.name, category: t.category, language: t.language,
      header: t.header ?? "", headerType: t.headerType ?? "TEXT",
      body: t.body, footer: t.footer ?? "", buttons: (t.buttons as any[]) ?? [] });
    setLocationDetails(parseLocationDetails(t.header));
    const vars = [...new Set([...t.body.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]))];
    setBodyVarLabels(Object.fromEntries(vars.map(k => [k, ""])));
    setShowModal(true);
  }

  function handleDuplicate(t: Template) {
    setError(""); setEditingId(null);
    setForm({ name: t.name + "_copy", category: t.category, language: t.language,
      header: t.header ?? "", headerType: t.headerType ?? "TEXT",
      body: t.body, footer: t.footer ?? "", buttons: (t.buttons as any[]) ?? [] });
    setLocationDetails(parseLocationDetails(t.header));
    const vars = [...new Set([...t.body.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]))];
    setBodyVarLabels(Object.fromEntries(vars.map(k => [k, ""])));
    setShowModal(true); setOpenMenuId(null);
  }

  function handleBodyChange(value: string) {
    setForm(f => ({ ...f, body: value }));
    const vars = [...new Set([...value.matchAll(/\{\{(\d+)\}\}/g)].map(m => m[1]))];
    setBodyVarLabels(prev => Object.fromEntries(vars.map(k => [k, prev[k] ?? ""])));
  }

  function addButton() { setForm(f => ({ ...f, buttons: [...f.buttons, { type: "QUICK_REPLY", text: "" }] })); }
  function updateButton(i: number, patch: Partial<typeof DEFAULT_FORM.buttons[0]>) {
    setForm(f => { const b = [...f.buttons]; b[i] = { ...b[i], ...patch }; return { ...f, buttons: b }; });
  }
  function removeButton(i: number) { setForm(f => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) })); }

  function openSendModal(t: Template) {
    const matches = [...t.body.matchAll(/\{\{(\d+)\}\}/g)];
    const count = matches.length ? Math.max(...matches.map(m => parseInt(m[1]))) : 0;
    setBodyVars(Array(count).fill(""));
    setHeaderUrl(""); setLocationDetails(parseLocationDetails(t.header)); setSelectedContact(null); setContactSearch(""); setContacts([]); setSendError("");
    setSendTemplate(t); setOpenMenuId(null);
  }

  const fetchContacts = useCallback(async (q: string) => {
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=20`, { credentials: "include" });
    const data = await res.json();
    setContacts(Array.isArray(data.contacts) ? data.contacts : []);
  }, []);

  useEffect(() => { if (sendTemplate) fetchContacts(contactSearch); }, [contactSearch, sendTemplate, fetchContacts]);

  const [mediaLibrary, setMediaLibrary] = useState<{ id: string; url: string; name: string; metaHandle?: string | null }[]>([]);
  const [showLibrary, setShowLibrary] = useState<"send" | "create" | null>(null);

  async function fetchMediaLibrary() {
    try {
      const res = await fetch("/api/media", { credentials: "include" });
      if (!res.ok) { setMediaLibrary([]); return; }
      const data = await res.json();
      setMediaLibrary(Array.isArray(data) ? data : []);
    } catch {
      setMediaLibrary([]);
    }
  }

  async function handleHeaderUpload(file: File | null, target: "send" | "create" = "send") {
    if (!file) return;
    setUploadingHeader(true);
    if (target === "send") setSendError(""); else setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      if (target === "send") setHeaderUrl(data.url ?? "");
      else setForm((f) => ({ ...f, header: data.url ?? "" }));
    } catch (err: any) {
      if (target === "send") setSendError(err?.message ?? "Upload failed");
      else setError(err?.message ?? "Upload failed");
    } finally { setUploadingHeader(false); }
  }

  async function handleSend() {
    if (!sendTemplate || !selectedContact) return;
    setSending(true); setSendError("");
    const resolvedHeader = sendTemplate.headerType === "LOCATION"
      ? JSON.stringify({
          latitude: locationDetails.latitude.trim(),
          longitude: locationDetails.longitude.trim(),
          name: locationDetails.name.trim(),
          address: locationDetails.address.trim(),
        })
      : headerUrl.trim() || undefined;

    const res = await fetch(`/api/templates/${sendTemplate.id}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: selectedContact.id,
        variables: bodyVars.length ? { body: bodyVars } : undefined,
        headerUrl: resolvedHeader }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setSendError(data.error ?? "Failed to send"); return; }
    setSendTemplate(null);
  }

  // Derived counts for stat cards
  const total = templates.length;
  const counts = {
    APPROVED: templates.filter(t => t.status === "APPROVED").length,
    PENDING:  templates.filter(t => t.status === "PENDING").length,
    REJECTED: templates.filter(t => t.status === "REJECTED").length,
    DRAFT:    templates.filter(t => t.status === "DRAFT").length,
  };

  // Filter by category chip
  const filtered = templates.filter(t => {
    if (categoryChip === "All") return true;
    const chip = categoryChip.toUpperCase();
    if (chip === "MARKETING" || chip === "UTILITY" || chip === "AUTHENTICATION") return t.category === chip;
    if (chip === "IMAGE") return t.headerType === "IMAGE";
    if (chip === "VIDEO") return t.headerType === "VIDEO";
    if (chip === "CAROUSEL") return t.headerType === "CAROUSEL";
    if (chip === "BUTTONS") return Array.isArray(t.buttons) && t.buttons.length > 0;
    return true;
  });

  if (authLoading) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f6f8]">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Templates</h1>
            <span className="text-gray-400 cursor-help" title="Manage your WhatsApp message templates">ⓘ</span>
          </div>
          <p className="text-sm font-medium text-gray-500 mt-0.5">Create, manage and send WhatsApp templates to your customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Search size={15} className="text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-44 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
          <button onClick={() => { setShowModal(true); setError(""); setForm(DEFAULT_FORM); setLocationDetails(DEFAULT_LOCATION_DETAILS); setBodyVarLabels({}); setEditingId(null); }}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition shadow-sm">
            <Plus size={15} /> New Template
          </button>
        </div>
      </div>

      {/* ── Main split layout ──────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-4">
          {/* Total */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <FileText size={18} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Total Templates</p>
              <p className="text-3xl font-extrabold text-gray-900 leading-tight">{total}</p>
              <p className="text-xs font-medium text-gray-400">All templates</p>
            </div>
          </div>
          {/* Approved */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Approved</p>
              <p className="text-3xl font-extrabold text-gray-900 leading-tight">{counts.APPROVED}</p>
              <p className="text-xs font-semibold text-green-600">
                {total ? ((counts.APPROVED / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
          {/* Pending */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Pending</p>
              <p className="text-3xl font-extrabold text-gray-900 leading-tight">{counts.PENDING}</p>
              <p className="text-xs font-semibold text-amber-500">
                {total ? ((counts.PENDING / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
          {/* Rejected */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <XCircle size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Rejected</p>
              <p className="text-3xl font-extrabold text-gray-900 leading-tight">{counts.REJECTED}</p>
              <p className="text-xs font-semibold text-red-500">
                {total ? ((counts.REJECTED / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
          {/* Draft */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FileEdit size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Draft</p>
              <p className="text-3xl font-extrabold text-gray-900 leading-tight">{counts.DRAFT}</p>
              <p className="text-xs font-semibold text-blue-500">
                {total ? ((counts.DRAFT / total) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
          </div>
        </div>

        {/* ── Status Tabs + Category Chips + Sort/View ────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Status Tabs row */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0 border-b border-gray-100">
            <div className="flex items-center gap-1">
              {STATUS_TABS.map(t => {
                const cnt = t.key === "ALL" ? total
                  : t.key === "APPROVED" ? counts.APPROVED
                  : t.key === "PENDING"  ? counts.PENDING
                  : t.key === "REJECTED" ? counts.REJECTED
                  : counts.DRAFT;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`relative px-4 py-2.5 text-sm font-bold transition ${
                      tab === t.key
                        ? "text-green-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-green-600"
                        : "text-gray-500 hover:text-gray-800"
                    }`}>
                    {t.label}
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      tab === t.key ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>{cnt}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pb-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                <span>Sort by: Updated (Newest)</span>
                <ChevronDown size={13} />
              </button>
              <button onClick={() => setViewMode("grid")}
                className={`rounded-lg p-1.5 transition ${viewMode === "grid" ? "bg-green-50 text-green-600" : "text-gray-400 hover:bg-gray-50"}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setViewMode("list")}
                className={`rounded-lg p-1.5 transition ${viewMode === "list" ? "bg-green-50 text-green-600" : "text-gray-400 hover:bg-gray-50"}`}>
                <List size={16} />
              </button>
            </div>
          </div>

          {/* Category chips row */}
          <div className="flex items-center gap-2 px-5 py-3 flex-wrap">
            {CATEGORY_CHIPS.map(chip => (
              <button key={chip} onClick={() => setCategoryChip(chip)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition border ${
                  categoryChip === chip
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}>
                {chip}
              </button>
            ))}
            <button className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition">
              <SlidersHorizontal size={13} /> More filters
            </button>
          </div>
        </div>

        {/* ── Template Grid ───────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={22} className="animate-spin mr-2" /> Loading templates…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <FileText size={36} className="text-gray-300" />
            <p className="text-sm font-medium">No templates found</p>
            <button onClick={() => { setShowModal(true); setError(""); setForm(DEFAULT_FORM); setBodyVarLabels({}); setEditingId(null); }}
              className="text-xs text-green-600 hover:underline font-medium">+ Create your first template</button>
          </div>
        ) : (
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            : "flex flex-col gap-3"}>
            {filtered.map(t => {
              const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.DRAFT;
              const maxButtons = 2;
              const visibleButtons = t.buttons?.slice(0, maxButtons) ?? [];
              const extraButtons = (t.buttons?.length ?? 0) - maxButtons;
              const isSelected = previewTemplate?.id === t.id;
              return (
                <div
                  key={t.id}
                  onMouseEnter={() => setPreviewTemplate(t)}
                  onClick={() => setPreviewTemplate(t)}
                  className={`flex flex-col bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer ${
                    isSelected ? "border-green-400 ring-2 ring-green-100" : "border-gray-200"
                  }`}
                >

                  {/* Card top: name + status + menu */}
                  <div className="flex items-start justify-between px-4 pt-3 pb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{t.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${st.badge}`}>
                        {st.label}
                      </span>
                      <div className="relative">
                        <button onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                          className="rounded p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenuId === t.id && (
                          <div className="absolute right-0 top-6 z-30 w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1">
                            {t.status === "APPROVED" && (
                              <button onClick={() => openSendModal(t)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                <Send size={13} className="text-green-600" /> Send
                              </button>
                            )}
                            <button onClick={() => { openEditModal(t); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                              <FileEdit size={13} className="text-blue-500" /> Edit
                            </button>
                            <button onClick={() => handleDuplicate(t)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                              <Copy size={13} className="text-gray-500" /> Duplicate
                            </button>
                            <div className="my-1 border-t border-gray-100" />
                            <button onClick={() => { handleDelete(t.id); setOpenMenuId(null); }} disabled={deletingId === t.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50">
                              {deletingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Chat Bubble Preview */}
                  <div
                    className="flex-1 px-3 py-3"
                    style={{ background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5ddd5'/%3E%3C/svg%3E\")" }}
                    onClick={() => setOpenMenuId(null)}>
                    <div className="ml-auto max-w-[95%] rounded-xl bg-white shadow overflow-hidden">
                      {/* Image header */}
                      {t.headerType === "IMAGE" ? (
                        t.header ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.header} alt="header" className="w-full h-28 object-cover" />
                        ) : (
                          <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-400">🖼️ Image</span>
                          </div>
                        )
                      ) : t.headerType === "VIDEO" && t.header ? (
                        <div className="px-3 pt-2.5 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-500">🎬 Video</span>
                        </div>
                      ) : t.headerType === "DOCUMENT" && t.header ? (
                        <div className="px-3 pt-2.5 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-500">📄 Document</span>
                        </div>
                      ) : t.headerType === "LOCATION" ? (
                        <div className="px-3 pt-2.5 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-500">📍 Location</span>
                        </div>
                      ) : t.headerType === "TEXT" && t.header ? (
                        <div className="px-3 pt-2.5">
                          <p className="text-sm font-extrabold text-gray-900 leading-snug">{t.header}</p>
                        </div>
                      ) : null}

                      {/* Body */}
                      <div className="px-3 pt-2 pb-0.5">
                        <p className="text-[13px] font-medium text-gray-800 leading-relaxed whitespace-pre-line line-clamp-5">{t.body}</p>
                      </div>

                      {/* Footer */}
                      {t.footer && (
                        <div className="px-3 pb-1">
                          <p className="text-xs font-medium text-gray-400">{t.footer}</p>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex justify-end px-2 pb-1">
                        <span className="text-xs font-medium text-gray-400">10:30 AM ✓✓</span>
                      </div>

                      {/* Buttons */}
                      {visibleButtons.length > 0 && (
                        <div className="border-t border-gray-100">
                          {visibleButtons.map((b: any, i: number) => (
                            <div key={i}
                              className={`flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-[#00a884] ${
                                i < visibleButtons.length - 1 ? "border-b border-gray-100" : ""
                              }`}>
                              {b.text}
                            </div>
                          ))}
                          {extraButtons > 0 && (
                            <div className="flex items-center justify-center py-2 text-sm font-semibold text-[#00a884] border-t border-gray-100">
                              + {extraButtons} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta tags row */}
                  <div className="flex items-center gap-1.5 px-4 py-2 flex-wrap" onClick={() => setOpenMenuId(null)}>
                    <span className="rounded px-2 py-0.5 bg-gray-100 text-xs font-semibold text-gray-600">{t.category.charAt(0) + t.category.slice(1).toLowerCase()}</span>
                    <span className="rounded px-2 py-0.5 bg-gray-100 text-xs font-semibold text-gray-600">{t.language.toUpperCase()}</span>
                    {t.headerType && <span className="rounded px-2 py-0.5 bg-gray-100 text-xs font-semibold text-gray-600">{t.headerType === "TEXT" ? "Text Only" : t.headerType.charAt(0) + t.headerType.slice(1).toLowerCase()}</span>}
                    {t.buttons && t.buttons.length > 0 && <span className="rounded px-2 py-0.5 bg-gray-100 text-xs font-semibold text-gray-600">{t.buttons.length} Button{t.buttons.length > 1 ? "s" : ""}</span>}
                  </div>

                  {/* Updated time */}
                  <div className="px-4 pb-2" onClick={() => setOpenMenuId(null)}>
                    <p className="text-xs font-medium text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {timeAgo(t.updatedAt ?? t.createdAt)}
                    </p>
                  </div>

                  {/* Rejected reason */}
                  {t.rejectedReason && (
                    <div className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-1.5">
                      <p className="text-xs font-semibold text-red-500">Rejected: {t.rejectedReason}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 px-4 py-2.5 border-t border-gray-100" onClick={() => setOpenMenuId(null)}>
                    {t.status === "APPROVED" && (
                      <button onClick={() => openSendModal(t)}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-50 transition">
                        <Send size={13} /> Send
                      </button>
                    )}
                    <button onClick={() => openEditModal(t)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 transition">
                      <FileEdit size={13} /> Edit
                    </button>
                    <button onClick={() => handleDuplicate(t)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 transition">
                      <Copy size={13} /> Duplicate
                    </button>
                    <button onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                      className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition">
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>{/* end LEFT scrollable */}

        {/* RIGHT: Mobile WhatsApp Preview Panel */}
        <div className="hidden lg:flex flex-col w-[340px] shrink-0 border-l border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {previewTemplate ? previewTemplate.name : "Hover a template to preview"}
            </p>
          </div>

          {/* Phone frame */}
          <div className="flex flex-1 items-center justify-center py-4 px-3 bg-[#f0f2f5] overflow-hidden">
            <div className="relative" style={{ width: 218 }}>
              {/* Side buttons */}
              <div className="absolute -left-[4px] top-[68px] w-[3px] h-6 rounded-l bg-gray-700" />
              <div className="absolute -left-[4px] top-[100px] w-[3px] h-9 rounded-l bg-gray-700" />
              <div className="absolute -left-[4px] top-[144px] w-[3px] h-9 rounded-l bg-gray-700" />
              <div className="absolute -right-[4px] top-[108px] w-[3px] h-12 rounded-r bg-gray-700" />

              {/* Phone shell */}
              <div className="flex flex-col rounded-[2.4rem] border-[5px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden" style={{ height: 448 }}>
                {/* Screen */}
                <div className="flex flex-col flex-1 overflow-hidden rounded-[1.9rem] bg-white">

                  {/* iOS status bar */}
                  <div className="relative flex items-center justify-between px-4 pt-[7px] pb-[3px] bg-[#075E54] shrink-0">
                    <span className="text-[9px] font-semibold text-white">9:41</span>
                    <div className="absolute left-1/2 -translate-x-1/2 top-[4px] w-[44px] h-[13px] rounded-full bg-gray-900" />
                    <div className="flex items-center gap-[3px]">
                      {/* signal bars */}
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="white">
                        <rect x="0" y="5" width="2" height="3" rx="0.4" opacity="0.4"/>
                        <rect x="3" y="3" width="2" height="5" rx="0.4" opacity="0.6"/>
                        <rect x="6" y="1" width="2" height="7" rx="0.4"/>
                        <rect x="9" y="0" width="2" height="8" rx="0.4"/>
                      </svg>
                      {/* wifi */}
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="1.3">
                        <path d="M0.5 3C2 1.2 8 1.2 9.5 3" strokeLinecap="round"/>
                        <path d="M2 5C3 3.8 7 3.8 8 5" strokeLinecap="round"/>
                        <circle cx="5" cy="7" r="0.9" fill="white" stroke="none"/>
                      </svg>
                      {/* battery */}
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <rect x="0.5" y="0.5" width="12" height="7" rx="1.5" stroke="white" strokeWidth="0.9"/>
                        <rect x="1.5" y="1.5" width="9" height="5" rx="0.8" fill="white"/>
                        <path d="M13.5 2.5 C14.5 2.5 14.5 5.5 13.5 5.5" stroke="white" strokeWidth="0.9" strokeLinecap="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* WhatsApp chat header */}
                  <div className="flex items-center gap-2 px-2 py-[7px] bg-[#075E54] shrink-0">
                    {/* back arrow */}
                    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 1L1 6.5L7 12"/>
                    </svg>
                    {/* avatar */}
                    <div className="w-[26px] h-[26px] rounded-full bg-[#DFE5E7] flex items-center justify-center shrink-0 overflow-hidden">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#aaa">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    </div>
                    {/* name + status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[10px] font-semibold leading-none truncate">
                        {previewTemplate ? previewTemplate.name.replace(/_/g, " ") : "Template Preview"}
                      </p>
                      <p className="text-[#b2dfdb] text-[8px] mt-[2px]">online</p>
                    </div>
                    {/* action icons */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white" opacity="0.9">
                        <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white" opacity="0.9">
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                      </svg>
                      <svg width="3" height="11" viewBox="0 0 4 16" fill="white" opacity="0.9">
                        <circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/>
                      </svg>
                    </div>
                  </div>

                  {/* Chat area — WA wallpaper bg */}
                  <div
                    className="flex-1 overflow-y-auto px-2 py-2 flex flex-col justify-end gap-1"
                    style={{
                      background: "#e5ddd5",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bdb8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    {previewTemplate ? (
                      <div className="relative ml-auto" style={{ maxWidth: "88%" }}>
                        {/* bubble with tail */}
                        <div className="relative rounded-tl-xl rounded-bl-xl rounded-br-xl bg-[#dcf8c6] shadow-sm overflow-hidden">
                          {/* tail */}
                          <div className="absolute -right-[6px] top-0 w-0 h-0"
                            style={{ borderLeft: "7px solid #dcf8c6", borderBottom: "7px solid transparent" }} />

                          {/* image header */}
                          {previewTemplate.headerType === "IMAGE" ? (
                            previewTemplate.header ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={previewTemplate.header} alt="header" className="w-full h-[80px] object-cover" />
                            ) : (
                              <div className="w-full h-[80px] bg-gray-100 flex items-center justify-center">
                                <span className="text-[10px] text-gray-400">🖼️ Image</span>
                              </div>
                            )
                          ) : previewTemplate.headerType === "VIDEO" && previewTemplate.header ? (
                            <div className="px-2 pt-2">
                              <p className="text-[10px] font-semibold text-gray-500">🎬 Video</p>
                            </div>
                          ) : previewTemplate.headerType === "DOCUMENT" && previewTemplate.header ? (
                            <div className="px-2 pt-2">
                              <p className="text-[10px] font-semibold text-gray-500">📄 Document</p>
                            </div>
                          ) : previewTemplate.headerType === "LOCATION" ? (
                            <div className="px-2 pt-2">
                              <p className="text-[10px] font-semibold text-gray-500">📍 Location</p>
                            </div>
                          ) : previewTemplate.headerType === "TEXT" && previewTemplate.header ? (
                            <div className="px-2 pt-2">
                              <p className="text-[10px] font-bold text-gray-900 leading-snug">{previewTemplate.header}</p>
                            </div>
                          ) : null}

                          {/* body */}
                          <div className="px-2 pt-1.5 pb-0.5">
                            <p className="text-[9.5px] text-gray-800 leading-relaxed whitespace-pre-line">{previewTemplate.body}</p>
                          </div>

                          {/* footer */}
                          {previewTemplate.footer && (
                            <div className="px-2 pb-0.5">
                              <p className="text-[8px] text-gray-400 italic">{previewTemplate.footer}</p>
                            </div>
                          )}

                          {/* timestamp + ticks */}
                          <div className="flex items-center justify-end gap-1 px-2 pb-1">
                            <span className="text-[7.5px] text-[#667781]">10:30 AM</span>
                            <svg width="14" height="8" viewBox="0 0 16 11" fill="#53bdeb">
                              <path d="M11.071.653a.75.75 0 00-1.142.97L11.5 3.5 5.5 9.5l-4-4L0 7l5.5 5.5 7.5-7.5-1.929-4.347z" opacity="0"/>
                              <path d="M15.854 1.146a.5.5 0 00-.707 0L6.5 9.793 1.854 5.146a.5.5 0 00-.707.707l5 5a.5.5 0 00.707 0l9.5-9.5a.5.5 0 000-.707z"/>
                              <path d="M11.854 1.146a.5.5 0 00-.707 0L6.5 5.793 5.354 4.646a.5.5 0 00-.707.707L6.5 7.207l5.354-5.354a.5.5 0 000-.707z" transform="translate(-3,0)"/>
                            </svg>
                          </div>
                        </div>

                        {/* CTA buttons below bubble */}
                        {Array.isArray(previewTemplate.buttons) && previewTemplate.buttons.length > 0 && (
                          <div className="mt-[2px] flex flex-col gap-[2px]">
                            {(previewTemplate.buttons as any[]).map((b: any, i: number) => (
                              <div key={i} className="bg-[#dcf8c6] rounded-lg flex items-center justify-center gap-1 py-1.5">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="#00a884">
                                  {b.type === "URL" ? <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/> :
                                   b.type === "PHONE_NUMBER" ? <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/> :
                                   <path d="M3 10h18M3 6h18M3 14h12"/>}
                                </svg>
                                <span className="text-[9px] font-semibold text-[#00a884]">{b.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-[8px] text-gray-400 bg-white/70 rounded px-2 py-1">Select a template to preview</p>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp input bar */}
                  <div className="flex items-center gap-1.5 px-1.5 py-1.5 bg-[#f0f2f5] shrink-0">
                    {/* emoji */}
                    <div className="w-[22px] h-[22px] flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#8696a0">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2.5-6H6.5C7 7.5 9.3 6 12 6s5 1.5 5.5 4.5z"/>
                      </svg>
                    </div>
                    {/* input pill */}
                    <div className="flex-1 flex items-center bg-white rounded-full px-2.5 py-[5px] gap-1">
                      <span className="text-[8.5px] text-[#8696a0] flex-1">Message</span>
                      {/* attach */}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#8696a0">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 015 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5a2.5 2.5 0 005 0V5c0-2.21-1.79-4-4-4S6 2.79 6 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                      </svg>
                    </div>
                    {/* mic */}
                    <div className="w-[26px] h-[26px] rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                      </svg>
                    </div>
                  </div>

                  {/* home indicator */}
                  <div className="flex justify-center py-1 bg-[#f0f2f5] shrink-0">
                    <div className="w-14 h-[3px] rounded-full bg-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons for previewed template */}
          {previewTemplate && (
            <div className="px-4 py-3 border-t border-gray-100 space-y-2 shrink-0">
              {previewTemplate.status === "APPROVED" && (
                <button onClick={() => openSendModal(previewTemplate)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition shadow-sm">
                  <Send size={14} /> Use Template
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={() => { openEditModal(previewTemplate); }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
                  <FileEdit size={12} /> Edit
                </button>
                <button onClick={() => handleDuplicate(previewTemplate)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
                  <Copy size={12} /> Copy
                </button>
              </div>
              <div className="flex items-center gap-1.5 justify-center flex-wrap pt-0.5">
                <span className="rounded-full px-2.5 py-0.5 bg-gray-100 text-[10px] font-semibold text-gray-600">{previewTemplate.category.charAt(0) + previewTemplate.category.slice(1).toLowerCase()}</span>
                <span className="rounded-full px-2.5 py-0.5 bg-gray-100 text-[10px] font-semibold text-gray-600">{previewTemplate.language.toUpperCase()}</span>
                {previewTemplate.headerType && <span className="rounded-full px-2.5 py-0.5 bg-gray-100 text-[10px] font-semibold text-gray-600">{previewTemplate.headerType}</span>}
              </div>
            </div>
          )}
        </div>

      </div>{/* end main split layout */}

      {/* Click-outside to close menu */}
      {openMenuId && <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />}

      {/* ── Send to Contact Modal ───────────────────────────── */}
      {sendTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Send Template</h2>
              <button onClick={() => setSendTemplate(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {sendError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{sendError}</p>}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-500 mb-1">{sendTemplate.name}</p>
                <p className="text-xs text-gray-700 whitespace-pre-line">{sendTemplate.body}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Select Contact *</label>
                {selectedContact ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{selectedContact.name}</p>
                      <p className="text-[11px] text-gray-500">{selectedContact.phone}</p>
                    </div>
                    <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                    {contacts.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                        {contacts.map(c => (
                          <button key={c.id} onClick={() => { setSelectedContact(c); setContactSearch(""); }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50">
                            <p className="text-xs font-medium text-gray-800">{c.name}</p>
                            <p className="text-[11px] text-gray-400">{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {sendTemplate.headerType === "LOCATION" ? (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Location Details <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <input value={locationDetails.latitude} onChange={e => setLocationDetails(v => ({ ...v, latitude: e.target.value }))}
                      placeholder="Latitude"
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500" />
                    <input value={locationDetails.longitude} onChange={e => setLocationDetails(v => ({ ...v, longitude: e.target.value }))}
                      placeholder="Longitude"
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500" />
                    <input value={locationDetails.name} onChange={e => setLocationDetails(v => ({ ...v, name: e.target.value }))}
                      placeholder="Location name"
                      className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500" />
                    <input value={locationDetails.address} onChange={e => setLocationDetails(v => ({ ...v, address: e.target.value }))}
                      placeholder="Address"
                      className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-green-500" />
                  </div>
                </div>
              ) : sendTemplate.headerType === "IMAGE" && (
                <div>
                  {sendTemplate.header?.includes("cloudinary.com") ? (
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sendTemplate.header} alt="header" className="w-full h-32 object-cover" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Header Image <span className="text-red-500">*</span></label>
                      {headerUrl?.trim() ? (
                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={headerUrl.trim()} alt="header" className="w-full h-32 object-cover" />
                          <button type="button" onClick={() => setHeaderUrl("")}
                            className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                        <button type="button" onClick={() => sendFileInputRef.current?.click()} disabled={uploadingHeader}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-5 text-gray-400 hover:border-green-400 hover:text-green-500 disabled:opacity-60 transition">
                          {uploadingHeader ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                          <span className="text-xs">{uploadingHeader ? "Uploading…" : "Upload image to send"}</span>
                        </button>
                        <button type="button" onClick={() => { fetchMediaLibrary(); setShowLibrary("send"); }}
                          className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition">
                          📁 Choose from Library
                        </button>
                        </>
                      )}
                      <input ref={sendFileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file) handleHeaderUpload(file, "send"); e.target.value = ""; }} />
                    </div>
                  )}
                </div>
              )}
              {bodyVars.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Template Variables</label>
                  {bodyVars.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 w-10">{`{{${i + 1}}}`}</span>
                      <input value={v} onChange={e => setBodyVars(vars => vars.map((x, idx) => idx === i ? e.target.value : x))}
                        placeholder={`Value for {{${i + 1}}}`}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-green-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setSendTemplate(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSend}
                disabled={sending || !selectedContact || (sendTemplate?.headerType === "IMAGE" && !sendTemplate.header?.includes("cloudinary.com") && !headerUrl) || (sendTemplate?.headerType === "LOCATION" && (!locationDetails.latitude.trim() || !locationDetails.longitude.trim()))}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {sending && <Loader2 size={12} className="animate-spin" />}
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Template" : "New Template"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingId ? "Edit and save changes to this template" : "Create a WhatsApp message template"}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Template Name <span className="text-green-600">*</span></label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. welcome_message"
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Category <span className="text-green-600">*</span></label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Language <span className="text-green-600">*</span></label>
                  <select required value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    {form.headerType === "TEXT" ? "Header Text" : "Header Image"}
                    <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  {form.headerType === "IMAGE" ? (
                    <div>
                      {form.header?.trim() ? (
                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={form.header.trim()} alt="header preview" className="w-full h-32 object-cover" />
                          <button type="button" onClick={() => setForm(f => ({ ...f, header: "" }))}
                            className="absolute top-1.5 right-1.5 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                        <button type="button" onClick={() => createFileInputRef.current?.click()} disabled={uploadingHeader}
                          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-6 text-gray-400 hover:border-green-400 hover:text-green-500 disabled:opacity-60 transition">
                          {uploadingHeader ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                          <span className="text-xs font-medium">{uploadingHeader ? "Uploading…" : "Click to upload image"}</span>
                          <span className="text-[11px] text-gray-400">JPG, PNG — must be uploaded (no external URLs)</span>
                        </button>
                        <button type="button" onClick={() => { fetchMediaLibrary(); setShowLibrary("create"); }}
                          className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition">
                          📁 Choose from Library
                        </button>
                        </>
                      )}
                      <input ref={createFileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file) handleHeaderUpload(file, "create"); e.target.value = ""; }} />
                    </div>
                  ) : form.headerType === "LOCATION" ? (
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <input value={locationDetails.latitude} onChange={e => setLocationDetails(v => ({ ...v, latitude: e.target.value }))}
                        placeholder="Latitude"
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-green-500" />
                      <input value={locationDetails.longitude} onChange={e => setLocationDetails(v => ({ ...v, longitude: e.target.value }))}
                        placeholder="Longitude"
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-green-500" />
                      <input value={locationDetails.name} onChange={e => setLocationDetails(v => ({ ...v, name: e.target.value }))}
                        placeholder="Location name"
                        className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-green-500" />
                      <input value={locationDetails.address} onChange={e => setLocationDetails(v => ({ ...v, address: e.target.value }))}
                        placeholder="Address"
                        className="col-span-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-green-500" />
                    </div>
                  ) : (
                    <input value={form.header} onChange={e => setForm(f => ({ ...f, header: e.target.value }))}
                      placeholder="Enter header text…"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Header Type</label>
                  <select value={form.headerType} onChange={e => { const nextType = e.target.value; setForm(f => ({ ...f, headerType: nextType, header: "" })); setLocationDetails(DEFAULT_LOCATION_DETAILS); }}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition">
                    {HEADER_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Body <span className="text-green-600">*</span></label>
                <textarea required value={form.body} onChange={e => handleBodyChange(e.target.value)}
                  rows={4} placeholder="Hi {{1}}, your order {{2}} has been confirmed! 🎉"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100 transition resize-none" />
                <p className="mt-1 text-xs text-gray-400">Use <code className="bg-gray-100 px-1 rounded">{"{{1}}, {{2}}"}</code> for dynamic variables</p>
                {(/^\{\{\d+\}\}/.test(form.body.trim()) || /\{\{\d+\}\}$/.test(form.body.trim())) && (
                  <p className="mt-1 text-xs text-red-500">⚠️ Variable cannot be at the start or end of body.</p>
                )}
                {Object.keys(bodyVarLabels).length > 0 && (
                  <div className="mt-3 rounded-xl border border-green-100 bg-green-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-green-700 mb-1">Variable Sample Values</p>
                    {Object.keys(bodyVarLabels).sort().map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 rounded bg-green-200 px-1.5 py-0.5 text-center text-[11px] font-bold text-green-800">{`{{${key}}}`}</span>
                        <input value={bodyVarLabels[key]}
                          onChange={e => setBodyVarLabels(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={`Sample for {{${key}}}`}
                          className="flex-1 rounded-lg border border-green-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-green-500" />
                      </div>
                    ))}
                    <div className="mt-2 rounded-lg border border-green-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-400 mb-1">Preview</p>
                      <p className="text-xs text-gray-700 whitespace-pre-line" dangerouslySetInnerHTML={{
                        __html: form.body.replace(/\{\{(\d+)\}\}/g, (_, n) =>
                          bodyVarLabels[n]?.trim()
                            ? `<span style="color:#15803d;font-weight:600">${bodyVarLabels[n]}</span>`
                            : `<span style="color:#f87171;font-weight:600">{{${n}}}</span>`)
                      }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Footer <span className="text-xs font-normal text-gray-400">(optional)</span></label>
                <input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))}
                  placeholder="e.g. Reply STOP to unsubscribe"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Buttons <span className="text-xs font-normal text-gray-400">(optional)</span></label>
                  {form.buttons.length < 3 && (
                    <button type="button" onClick={addButton} className="text-xs font-medium text-green-600 hover:underline">+ Add Button</button>
                  )}
                </div>
                {form.buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <select value={btn.type} onChange={e => updateButton(i, { type: e.target.value })}
                      className="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition">
                      {["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "COUPON_CODE", "FLOW"].map(tp => <option key={tp}>{tp}</option>)}
                    </select>
                    <input value={btn.text} onChange={e => updateButton(i, { text: e.target.value })}
                      placeholder="Button label"
                      className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
                    {btn.type === "URL" && (
                      <input value={btn.url ?? ""} onChange={e => updateButton(i, { url: e.target.value })}
                        placeholder="https://…"
                        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <input value={btn.phone_number ?? ""} onChange={e => updateButton(i, { phone_number: e.target.value })}
                        placeholder="+1234567890"
                        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
                    )}
                    {(btn.type === "COPY_CODE" || btn.type === "COUPON_CODE") && (
                      <input value={btn.example ?? ""} onChange={e => updateButton(i, { example: e.target.value })}
                        placeholder="Example code"
                        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
                    )}
                    {btn.type === "FLOW" && (
                      <input value={btn.flow_id ?? ""} onChange={e => updateButton(i, { flow_id: e.target.value })}
                        placeholder="Flow ID or name"
                        className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition" />
                    )}
                    <button type="button" onClick={() => removeButton(i)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </form>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition">
                {creating && <Loader2 size={14} className="animate-spin" />}
                {creating ? (editingId ? "Saving…" : "Creating…") : (editingId ? "Save Changes" : "Create Template")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Media Library Picker Modal ──────────────────────────────────── */}
      {showLibrary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Media Library</h2>
              <button onClick={() => setShowLibrary(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {mediaLibrary.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No images uploaded yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {mediaLibrary.map(asset => (
                    <button key={asset.id} type="button"
                      onClick={() => {
                        if (showLibrary === "create") setForm(f => ({ ...f, header: asset.url }));
                        else setHeaderUrl(asset.url);
                        setShowLibrary(null);
                      }}
                      className="relative rounded-lg overflow-hidden border-2 border-transparent hover:border-green-400 transition group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.name} className="w-full h-24 object-cover" />
                      {asset.metaHandle && (
                        <span className="absolute top-1 right-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          Cached
                        </span>
                      )}
                      {asset.name && (
                        <p className="text-[10px] text-gray-500 truncate px-1 py-0.5 bg-white">{asset.name}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}