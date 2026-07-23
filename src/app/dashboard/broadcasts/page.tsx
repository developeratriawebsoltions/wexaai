"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Bell, Eye, X, Send, Loader2, ChevronRight, ChevronLeft, Radio, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Broadcast = {
  id: string;
  campaignName: string;
  templateName: string;
  audience: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

type BroadcastLog = {
  id: string;
  phone: string;
  status: string;
  messageId: string | null;
};

type Template = {
  id: string;
  name: string;
  body: string;
  status: string;
  headerType?: string | null;
  header?: string | null;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  sending:   "bg-blue-100 text-blue-700",
  pending:   "bg-yellow-100 text-yellow-700",
  failed:    "bg-red-100 text-red-600",
};

const FILTERS = ["All", "completed", "sending", "pending", "failed"];

const STEPS = ["Campaign", "Template", "Contacts", "Send"];

export default function BroadcastsPage() {
  const { token } = useAuth();

  // List state
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [headerUrl, setHeaderUrl] = useState("");
  const [audience, setAudience] = useState("all");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [canSendHeader, setCanSendHeader] = useState(true);
  const headerFileInputRef = useRef<HTMLInputElement | null>(null);

  // Detail modal
  const [detail, setDetail] = useState<(Broadcast & { logs: BroadcastLog[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBroadcasts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/broadcasts", { credentials: "include" });
      const data = await res.json();
      setBroadcasts(Array.isArray(data) ? data : []);
    } catch { setBroadcasts([]); }
    finally { setLoading(false); }
  };

  const fetchTemplates = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/templates?status=APPROVED", { credentials: "include" });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
  };

  const fetchContacts = async (query = "") => {
    if (!token) return;
    setContactsLoading(true);
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}&limit=20`, { credentials: "include" });
      const data = await res.json();
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => { fetchBroadcasts(); }, []);

  useEffect(() => {
    if (!selectedTemplate || selectedTemplate.headerType !== "IMAGE") {
      setHeaderUrl("");
      setCanSendHeader(true);
      return;
    }
    setHeaderUrl(selectedTemplate.header ?? "");
    setCanSendHeader(Boolean(selectedTemplate.header));
  }, [selectedTemplate]);

  useEffect(() => {
    if (showWizard && step === 2) {
      fetchContacts(contactSearch);
    }
  }, [showWizard, step, contactSearch]);

  const openWizard = () => {
    setStep(0);
    setCampaignName("");
    setSelectedTemplate(null);
    setHeaderUrl("");
    setAudience("all");
    setContactSearch("");
    setSelectedContactIds([]);
    setContacts([]);
    setWizardError("");
    setShowWizard(true);
    fetchTemplates();
  };

  const nextStep = () => {
    setWizardError("");
    if (step === 0 && !campaignName.trim()) { setWizardError("Campaign name is required."); return; }
    if (step === 1 && !selectedTemplate) { setWizardError("Please select a template."); return; }
    if (step === 2 && audience === "selected" && selectedContactIds.length === 0) {
      setWizardError("Select at least one contact or choose All Contacts.");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleHeaderUpload = async (file: File | null) => {
    if (!file || !token) return;
    setUploadingHeader(true);
    setWizardError("");

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
      setHeaderUrl(data.url ?? "");
      setCanSendHeader(true);
    } catch (err: any) {
      setWizardError(err?.message ?? "Upload failed");
    } finally {
      setUploadingHeader(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setWizardError("");
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          templateName: selectedTemplate!.name,
          audience,
          contactIds: audience === "selected" ? selectedContactIds : undefined,
          headerUrl: selectedTemplate?.headerType === "IMAGE" ? headerUrl.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setWizardError(data.error ?? "Failed to send."); setSending(false); return; }
      setShowWizard(false);
      fetchBroadcasts();
    } catch { setWizardError("Something went wrong."); }
    finally { setSending(false); }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/broadcasts/${id}`, { credentials: "include" });
      setDetail(await res.json());
    } finally { setDetailLoading(false); }
  };

  const filtered = broadcasts.filter((b) => {
    const matchFilter = filter === "All" || b.status === filter;
    const matchSearch = b.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      b.templateName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Broadcasts</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Bell size={18} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">All Broadcasts</h2>
            <button
              onClick={openWizard}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
            >
              <Radio size={13} /> New Broadcast
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-gray-100 px-5 py-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  filter === f ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Radio size={32} className="text-gray-200" />
              <p className="text-sm text-gray-400">No broadcasts yet.</p>
              <button onClick={openWizard} className="text-xs text-green-600 hover:underline">
                Create your first broadcast
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Campaign Name</th>
                  <th className="px-3 py-3 text-left font-medium">Template</th>
                  <th className="px-3 py-3 text-left font-medium">Contacts</th>
                  <th className="px-3 py-3 text-left font-medium">Sent</th>
                  <th className="px-3 py-3 text-left font-medium">Failed</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Date</th>
                  <th className="px-3 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{b.campaignName}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{b.templateName}</td>
                    <td className="px-3 py-3 text-gray-700">{b.totalCount}</td>
                    <td className="px-3 py-3 font-semibold text-green-600">{b.sentCount}</td>
                    <td className="px-3 py-3 font-semibold text-red-500">{b.failedCount}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => openDetail(b.id)} className="text-gray-300 hover:text-blue-500 transition">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Wizard Modal ── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            {/* Wizard header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Step {step + 1} of {STEPS.length}</p>
                <h3 className="text-sm font-semibold text-gray-800">{STEPS[step]}</h3>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-0 px-5 pt-4">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition ${
                    i < step ? "bg-green-600 text-white" :
                    i === step ? "bg-green-600 text-white ring-4 ring-green-100" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < step ? "bg-green-600" : "bg-gray-100"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div className="px-5 py-5 min-h-[180px]">
              {wizardError && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{wizardError}</p>
              )}

              {/* Step 0 — Campaign Name */}
              {step === 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600">Campaign Name</label>
                  <input
                    autoFocus
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && nextStep()}
                    placeholder="e.g. Weekend Sale"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
                  />
                  <p className="mt-2 text-xs text-gray-400">Give your campaign a clear name to identify it later.</p>
                </div>
              )}

              {/* Step 1 — Select Template */}
              {step === 1 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">Select Template</label>
                  {templates.length === 0 ? (
                    <p className="rounded-lg bg-yellow-50 px-3 py-3 text-xs text-yellow-700">
                      No approved templates found. Please create and get a template approved first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplate(t)}
                          className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                            selectedTemplate?.id === t.id
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <p className="text-xs font-semibold text-gray-800">{t.name}</p>
                          <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-2">{t.body}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedTemplate?.headerType === "IMAGE" && (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-xs font-medium text-gray-600">Header Image URL (optional)</label>
                      <div className="flex items-center gap-2">
                        <input
                          value={headerUrl}
                          onChange={(e) => {
                            setHeaderUrl(e.target.value);
                            setCanSendHeader(Boolean(e.target.value.trim()));
                          }}
                          placeholder="https://your-public-domain.com/image.jpg"
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
                        />
                        <button
                          type="button"
                          onClick={() => headerFileInputRef.current?.click()}
                          disabled={uploadingHeader}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-2 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {uploadingHeader ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                          Upload
                        </button>
                        <input
                          ref={headerFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            if (file) handleHeaderUpload(file);
                            e.target.value = "";
                          }}
                        />
                      </div>
                      <p className="mt-2 rounded-md border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                        Note: Upload an image before sending.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 — Select Contacts */}
              {step === 2 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">Audience</label>
                  <div className="space-y-2">
                    {[
                      { value: "all", label: "All Contacts", desc: "Send to every contact in your workspace" },
                      { value: "selected", label: "Select Contacts", desc: "Search and choose individual contacts by number" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setAudience(opt.value);
                          if (opt.value === "all") {
                            setSelectedContactIds([]);
                          }
                        }}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                          audience === opt.value
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                        <p className="text-[11px] text-gray-400">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {audience === "selected" && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                        <Search size={14} className="text-gray-400" />
                        <input
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          placeholder="Search contacts by name, phone, or email"
                          className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                        />
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white max-h-60 overflow-y-auto">
                        {contactsLoading ? (
                          <div className="flex items-center justify-center p-4 text-sm text-gray-500">Loading contacts…</div>
                        ) : contacts.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500">No contacts found. Try searching by number or name.</div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {contacts.map((contact) => {
                              const selected = selectedContactIds.includes(contact.id);
                              return (
                                <button
                                  key={contact.id}
                                  type="button"
                                  onClick={() => {
                                    setAudience("selected");
                                    setSelectedContactIds((prev) =>
                                      prev.includes(contact.id)
                                        ? prev.filter((id) => id !== contact.id)
                                        : [...prev, contact.id]
                                    );
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                                    selected ? "border border-green-500 bg-green-50" : "border border-transparent hover:border-gray-200"
                                  }`}
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-gray-800">{contact.name || contact.phone}</p>
                                    <p className="mt-0.5 text-[11px] text-gray-400">{contact.phone}</p>
                                  </div>
                                  <div className={`h-4 w-4 rounded-full border ${selected ? "border-green-600 bg-green-600" : "border-gray-300"}`} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {selectedContactIds.length > 0 && (
                        <p className="text-xs text-gray-500">{selectedContactIds.length} contact{selectedContactIds.length === 1 ? "" : "s"} selected.</p>
                      )}
                    </div>
                  )}

                  <p className="mt-3 text-[11px] text-gray-400">More audience filters (tags, segments) coming soon.</p>
                </div>
              )}

              {/* Step 3 — Review & Send */}
              {step === 3 && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-gray-50 p-4 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Campaign</span>
                      <span className="font-semibold text-gray-800">{campaignName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Template</span>
                      <span className="font-semibold text-gray-800">{selectedTemplate?.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Audience</span>
                      <span className="font-semibold text-gray-800 capitalize">{audience === "all" ? "All Contacts" : audience}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Schedule</span>
                      <span className="font-semibold text-gray-800">Send Now</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    This will send the template to all contacts immediately via Meta WhatsApp API.
                  </p>
                </div>
              )}
            </div>

            {/* Wizard footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => step === 0 ? setShowWizard(false) : setStep((s) => s - 1)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                <ChevronLeft size={13} />
                {step === 0 ? "Cancel" : "Back"}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
                >
                  Next <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={sending || (selectedTemplate?.headerType === "IMAGE" && !canSendHeader)}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {sending ? "Sending..." : "Send Broadcast"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">{detail?.campaignName ?? "Loading..."}</h3>
                {detail && <p className="text-[11px] text-gray-400">{detail.templateName}</p>}
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin text-green-600" />
              </div>
            ) : detail ? (
              <div className="p-5">
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-bold text-gray-800">{detail.totalCount}</p>
                    <p className="text-[11px] text-gray-400">Total</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3 text-center">
                    <p className="text-xl font-bold text-green-600">{detail.sentCount}</p>
                    <p className="text-[11px] text-gray-400">Sent</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3 text-center">
                    <p className="text-xl font-bold text-red-500">{detail.failedCount}</p>
                    <p className="text-[11px] text-gray-400">Failed</p>
                  </div>
                </div>

                {/* Progress bar */}
                {detail.totalCount > 0 && (
                  <div className="mb-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${Math.round((detail.sentCount / detail.totalCount) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-gray-400">
                      {Math.round((detail.sentCount / detail.totalCount) * 100)}% delivered
                    </p>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-gray-400">
                        <th className="px-3 py-2 text-left font-medium">Phone</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Message ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{log.phone}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${
                              log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400 font-mono truncate max-w-[140px]">
                            {log.messageId ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
