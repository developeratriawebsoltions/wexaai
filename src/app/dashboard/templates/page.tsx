"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Bell, RefreshCw, Trash2, Plus, X, Loader2, Send } from "lucide-react";
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
}

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-600",
  PAUSED: "bg-gray-100 text-gray-600",
};

const TABS = ["ALL", "APPROVED", "PENDING", "REJECTED"];
const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "en_US", label: "English (US)" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
];

const DEFAULT_FORM = {
  name: "", category: "UTILITY", language: "en",
  header: "", headerType: "TEXT", body: "", footer: "",
  buttons: [] as { type: string; text: string; url?: string; phone_number?: string }[],
};

export default function TemplatesPage() {
  const { token, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Send modal state
  const [sendTemplate, setSendTemplate] = useState<Template | null>(null);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [bodyVars, setBodyVars] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "ALL") params.set("status", tab);
    if (search) params.set("search", search);
    const res = await fetch(`/api/templates?${params}`, {
      credentials: "include",
    });
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [token, tab, search]);

  useEffect(() => {
    if (!authLoading) fetchTemplates();
  }, [authLoading, fetchTemplates]);

  async function handleSync() {
    if (!token) return;
    setSyncing(true);
    await fetch("/api/templates/sync", {
      method: "POST",
      credentials: "include",
    });
    setSyncing(false);
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    if (!token || !confirm("Delete this template?")) return;
    setDeletingId(id);
    await fetch(`/api/templates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setDeletingId(null);
    setTemplates(t => t.filter(x => x.id !== id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/templates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        header: form.header || undefined,
        footer: form.footer || undefined,
        buttons: form.buttons.length ? form.buttons : undefined,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
    setShowModal(false);
    setForm(DEFAULT_FORM);
    fetchTemplates();
  }

  function addButton() {
    setForm(f => ({ ...f, buttons: [...f.buttons, { type: "QUICK_REPLY", text: "" }] }));
  }

  function updateButton(i: number, patch: Partial<typeof DEFAULT_FORM.buttons[0]>) {
    setForm(f => {
      const buttons = [...f.buttons];
      buttons[i] = { ...buttons[i], ...patch };
      return { ...f, buttons };
    });
  }

  function removeButton(i: number) {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }));
  }

  function openSendModal(t: Template) {
    const matches = [...t.body.matchAll(/\{\{(\d+)\}\}/g)];
    const count = matches.length ? Math.max(...matches.map(m => parseInt(m[1]))) : 0;
    setBodyVars(Array(count).fill(""));
    setSelectedContact(null);
    setContactSearch("");
    setContacts([]);
    setSendError("");
    setSendTemplate(t);
  }

  const fetchContacts = useCallback(async (q: string) => {
    if (!token) return;
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=20`, {
      credentials: "include",
    });
    const data = await res.json();
    setContacts(Array.isArray(data.contacts) ? data.contacts : []);
  }, [token]);

  useEffect(() => {
    if (sendTemplate) fetchContacts(contactSearch);
  }, [contactSearch, sendTemplate, fetchContacts]);

  async function handleSend() {
    if (!token || !sendTemplate || !selectedContact) return;
    setSending(true);
    setSendError("");
    const res = await fetch(`/api/templates/${sendTemplate.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: selectedContact.id,
        variables: bodyVars.length ? { body: bodyVars } : undefined,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setSendError(data.error ?? "Failed to send"); return; }
    setSendTemplate(null);
  }

  if (authLoading) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Templates</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search anything..." className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Bell size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${tab === t ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {t === "ALL" ? "All Templates" : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 py-1.5">
              <Search size={13} className="text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search templates..." className="w-36 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400" />
            </div>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync"}
            </button>
            <button onClick={() => { setShowModal(true); setError(""); setForm(DEFAULT_FORM); }}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
              <Plus size={13} /> New Template
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <p className="text-sm">No templates found.</p>
            <button onClick={() => { setShowModal(true); setError(""); setForm(DEFAULT_FORM); }}
              className="text-xs text-green-600 hover:underline">Create your first template</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {templates.map(t => (
              <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.category} · {t.language}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[t.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {t.status}
                  </span>
                </div>
                {t.header && (
                  <p className="text-xs font-semibold text-gray-700 truncate">{t.header}</p>
                )}
                <p className="flex-1 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-xs text-gray-600 leading-relaxed line-clamp-4">{t.body}</p>
                {t.footer && <p className="text-[11px] text-gray-400 italic">{t.footer}</p>}
                {t.rejectedReason && (
                  <p className="text-[11px] text-red-500">Reason: {t.rejectedReason}</p>
                )}
                {t.buttons && t.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.buttons.map((b, i) => (
                      <span key={i} className="rounded border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">{b.text}</span>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  {t.status === "APPROVED" && (
                    <button onClick={() => openSendModal(t)}
                      className="text-gray-300 hover:text-green-600 transition" title="Send to contact">
                      <Send size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}
                    className="text-gray-300 hover:text-red-500 transition disabled:opacity-40">
                    {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send to Contact Modal */}
      {sendTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Send Template</h2>
              <button onClick={() => setSendTemplate(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {sendError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{sendError}</p>}

              {/* Template preview */}
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-500 mb-1">{sendTemplate.name}</p>
                <p className="text-xs text-gray-700 whitespace-pre-line">{sendTemplate.body}</p>
              </div>

              {/* Contact search */}
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

              {/* Body variables */}
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
              <button onClick={handleSend} disabled={sending || !selectedContact}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {sending && <Loader2 size={12} className="animate-spin" />}
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">New Template</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Template Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. welcome_message"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category *</label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Language *</label>
                  <select required value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500">
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Header (optional)</label>
                  <input value={form.header} onChange={e => setForm(f => ({ ...f, header: e.target.value }))}
                    placeholder="Header text"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Header Type</label>
                  <select value={form.headerType} onChange={e => setForm(f => ({ ...f, headerType: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500">
                    {["TEXT", "IMAGE", "VIDEO", "DOCUMENT"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Body *</label>
                <textarea required value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={4} placeholder="Hi {{1}}, your message here..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500 resize-none" />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Footer (optional)</label>
                <input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))}
                  placeholder="Footer text"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Buttons (optional)</label>
                  {form.buttons.length < 3 && (
                    <button type="button" onClick={addButton} className="text-xs text-green-600 hover:underline">+ Add</button>
                  )}
                </div>
                {form.buttons.map((btn, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <select value={btn.type} onChange={e => updateButton(i, { type: e.target.value })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-green-500">
                      {["QUICK_REPLY", "URL", "PHONE_NUMBER"].map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input value={btn.text} onChange={e => updateButton(i, { text: e.target.value })}
                      placeholder="Button text" className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-green-500" />
                    {btn.type === "URL" && (
                      <input value={btn.url ?? ""} onChange={e => updateButton(i, { url: e.target.value })}
                        placeholder="https://..." className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-green-500" />
                    )}
                    {btn.type === "PHONE_NUMBER" && (
                      <input value={btn.phone_number ?? ""} onChange={e => updateButton(i, { phone_number: e.target.value })}
                        placeholder="+1234567890" className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-green-500" />
                    )}
                    <button type="button" onClick={() => removeButton(i)} className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                ))}
              </div>
            </form>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {creating && <Loader2 size={12} className="animate-spin" />}
                {creating ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
