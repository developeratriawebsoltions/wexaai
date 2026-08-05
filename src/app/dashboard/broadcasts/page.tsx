"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Bell, Eye, X, Send, Loader2, ChevronRight, ChevronLeft, Radio } from "lucide-react";
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
  scheduledAt?: string | null;
  readCount?: number;
  repliedCount?: number;
  createdAt: string;
};

type BroadcastLog = {
  id: string;
  phone: string;
  status: string;
  messageId: string | null;
  errorReason: string | null;
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
  scheduled: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-100 text-gray-500",
  failed:    "bg-red-100 text-red-600",
};

const FILTERS = ["All", "completed", "sending", "pending", "failed"];
const PERIODS = ["Last 7 days", "Last 30 days", "This Month", "Last Month"];
const SORT_OPTIONS = ["Latest", "Oldest", "Most Successful", "Most Failed"];
const SIDEBAR_ITEMS = [
  { label: "Broadcast History", active: true },
  { label: "Scheduled Broadcasts", active: false },
  { label: "Template Messages", active: false },
];

const STEPS = ["Campaign", "Template", "Contacts", "Send"];

export default function BroadcastsPage() {
  const { token, loading: authLoading } = useAuth();

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
  const [bodyVariables, setBodyVariables] = useState<Record<string, string>>({});
  const [audience, setAudience] = useState("all");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [wizardError, setWizardError] = useState("");
  const [canSendHeader, setCanSendHeader] = useState(true);

  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState(PERIODS[0]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [updatedAt, setUpdatedAt] = useState("Just now");
  const [messagingLimit, setMessagingLimit] = useState("-");

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

  useEffect(() => {
    if (!authLoading && token) {
      fetchBroadcasts();
    }
  }, [authLoading, token]);

  useEffect(() => {
    if (!selectedTemplate) {
      setHeaderUrl("");
      setCanSendHeader(true);
      setBodyVariables({});
      return;
    }
    // Extract {{1}}, {{2}} etc. from body
    const vars = [...(selectedTemplate.body.matchAll(/\{\{(\d+)\}\}/g))].map((m) => m[1]);
    const unique = [...new Set(vars)];
    setBodyVariables(Object.fromEntries(unique.map((k) => [k, ""])));

    if (selectedTemplate.headerType !== "IMAGE") {
      setHeaderUrl("");
      setCanSendHeader(true);
      return;
    }
    setHeaderUrl("");
    // Agar template ka header already Cloudinary URL hai toh upload ki zaroorat nahi
    const hasCloudinaryHeader = !!selectedTemplate.header?.includes("cloudinary.com");
    setCanSendHeader(hasCloudinaryHeader);
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
    setBodyVariables({});
    setAudience("all");
    setContactSearch("");
    setSelectedContactIds([]);
    setContacts([]);
    setScheduledAt("");
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
          bodyVariables: Object.keys(bodyVariables).length > 0 ? bodyVariables : undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
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

  const parsedFromDate = new Date(fromDate);
  const parsedToDate = new Date(toDate);

  const parsedToDateEnd = new Date(parsedToDate);
  parsedToDateEnd.setHours(23, 59, 59, 999);

  const dateFiltered = broadcasts.filter((b) => {
    if (!fromDate || !toDate) return true;
    const created = new Date(b.createdAt);
    return created >= parsedFromDate && created <= parsedToDateEnd;
  });

  const filtered = dateFiltered.filter((b) => {
    const matchFilter = filter === "All" || b.status === filter;
    const matchSearch = b.campaignName.toLowerCase().includes(search.toLowerCase()) ||
      b.templateName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const sortedBroadcasts = [...filtered].sort((a, b) => {
    if (sortBy === "Latest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "Oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "Most Successful") return b.sentCount - a.sentCount;
    if (sortBy === "Most Failed") return b.failedCount - a.failedCount;
    return 0;
  });

  const overviewStats = {
    sent: broadcasts.reduce((sum, item) => sum + item.sentCount, 0),
    delivered: broadcasts.reduce((sum, item) => sum + item.sentCount, 0),
    read: broadcasts.reduce((sum, item) => sum + (item.readCount ?? 0), 0),
    replied: broadcasts.reduce((sum, item) => sum + (item.repliedCount ?? 0), 0),
    sending: broadcasts.filter((item) => item.status === "sending").length,
    failed: broadcasts.reduce((sum, item) => sum + item.failedCount, 0),
    processing: 0,
    queued: broadcasts.filter((item) => item.status === "queued").length,
  };

  const scheduledBroadcasts = broadcasts.filter((item) => item.status === "scheduled");

  const cancelScheduled = async (id: string) => {
    await fetch(`/api/broadcasts/${id}`, { method: "DELETE", credentials: "include" });
    fetchBroadcasts();
  };

  const triggerScheduled = async () => {
    await fetch("/api/broadcasts/process-scheduled", {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? "wexa-cron-secret-2026"}` },
    });
    fetchBroadcasts();
  };

  const getProgress = (value: number, total: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  const handleExport = () => {
    const headers = ["Campaign Name", "Template", "Audience", "Scheduled", "Successful", "Recipients", "Failed", "Status"];
    const rows = sortedBroadcasts.map((item) => [
      item.campaignName,
      item.templateName,
      item.audience,
      new Date(item.createdAt).toLocaleString(),
      item.sentCount.toString(),
      item.totalCount.toString(),
      item.failedCount.toString(),
      item.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `broadcasts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    setUpdatedAt("Just now");
    fetchBroadcasts();
  };

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
        <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-800">Broadcasts</h2>
              <div className="mt-4 space-y-1">
                {SIDEBAR_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      item.active ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Scheduled Broadcasts</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{scheduledBroadcasts.length}</span>
                  {scheduledBroadcasts.length > 0 && (
                    <button
                      onClick={triggerScheduled}
                      className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-200"
                    >
                      Process Now
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {scheduledBroadcasts.length === 0 ? (
                  <p className="text-sm text-gray-500">No scheduled broadcasts yet.</p>
                ) : (
                  scheduledBroadcasts.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.campaignName}</p>
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <div className="flex items-center justify-between">
                          <span>{item.templateName}</span>
                          <span className="capitalize text-yellow-600 font-medium">{item.status}</span>
                        </div>
                        {item.scheduledAt && (
                          <div className="text-[11px] text-gray-400">
                            {new Date(item.scheduledAt).toLocaleString()}
                          </div>
                        )}
                        <button
                          onClick={() => cancelScheduled(item.id)}
                          className="mt-1 w-full rounded-lg border border-red-200 bg-red-50 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <main className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <label className="text-[11px] font-semibold uppercase text-gray-500">Date picker from</label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <label className="text-[11px] font-semibold uppercase text-gray-500">Date picker to</label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500"
                      />
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <label className="text-[11px] font-semibold uppercase text-gray-500">Period</label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500"
                      >
                        {PERIODS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
                    <button
                      onClick={handleRefresh}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Apply now
                    </button>
                    <button
                      onClick={handleExport}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      Export
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[11px] font-semibold uppercase text-gray-500">Messaging Limit</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{messagingLimit}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Sent", value: overviewStats.sent },
                  { label: "Delivered", value: overviewStats.delivered },
                  { label: "Read", value: overviewStats.read },
                  { label: "Replied", value: overviewStats.replied },
                  { label: "Sending", value: overviewStats.sending },
                  { label: "Failed", value: overviewStats.failed },
                  { label: "Processing", value: overviewStats.processing },
                  { label: "Queued", value: overviewStats.queued },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase text-gray-500">{stat.label}</p>
                    <p className="mt-3 text-xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Broadcast list</h3>
                    <p className="mt-1 text-xs text-gray-500">Review your campaign delivery performance.</p>
                  </div>
                  <button
                    onClick={openWizard}
                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <Radio size={14} className="mr-2" /> New Broadcast
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Sorted by</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleRefresh}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                  <span className="whitespace-nowrap">Updated: {updatedAt}</span>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={22} className="animate-spin text-green-600" />
                </div>
              ) : sortedBroadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Radio size={32} className="text-gray-200" />
                  <p className="text-sm text-gray-400">No broadcasts match your filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400">
                        <th className="px-4 py-3 text-left font-medium">Broadcast</th>
                        <th className="px-4 py-3 text-left font-medium">Scheduled</th>
                        <th className="px-4 py-3 text-left font-medium">Successful</th>
                        <th className="px-4 py-3 text-left font-medium">Read</th>
                        <th className="px-4 py-3 text-left font-medium">Replied</th>
                        <th className="px-4 py-3 text-left font-medium">Recipients</th>
                        <th className="px-4 py-3 text-left font-medium">Failed</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBroadcasts.map((item) => {
                        const successPercent = getProgress(item.sentCount, item.totalCount);
                        const readPercent = getProgress(item.readCount ?? 0, item.totalCount);
                        const repliedPercent = getProgress(item.repliedCount ?? 0, item.totalCount);
                        return (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-4 font-medium text-gray-800">{item.campaignName}</td>
                            <td className="px-4 py-4 text-gray-500 text-xs">{new Date(item.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-full border border-gray-200 bg-green-50">
                                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-green-700">
                                    {successPercent}%
                                  </div>
                                </div>
                                <span className="text-sm text-gray-700">{item.sentCount}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-full border border-gray-200 bg-gray-100">
                                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-600">
                                    {readPercent}%
                                  </div>
                                </div>
                                <span className="text-sm text-gray-700">{item.readCount ?? 0}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-full border border-gray-200 bg-gray-100">
                                  <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-600">
                                    {repliedPercent}%
                                  </div>
                                </div>
                                <span className="text-sm text-gray-700">{item.repliedCount ?? 0}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-700">{item.totalCount}</td>
                            <td className="px-4 py-4 text-red-600 font-semibold">{item.failedCount}</td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLE[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button onClick={() => openDetail(item.id)} className="text-gray-300 hover:text-blue-500 transition">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
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
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Select Template</label>
                  {templates.length === 0 ? (
                    <p className="rounded-lg bg-yellow-50 px-3 py-3 text-sm text-yellow-700">
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
                          <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                            {t.body.replace(/\{\{(\d+)\}\}/g, (_, n) => `{{${n}}}`)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Body variable inputs */}
                  {Object.keys(bodyVariables).length > 0 && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-xs font-semibold text-gray-700">Template Variables</label>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                        <p className="text-[11px] text-gray-400 mb-1" dangerouslySetInnerHTML={{ __html: "Preview: " + selectedTemplate!.body.replace(/\{\{(\d+)\}\}/g, (_, n) => bodyVariables[n]?.trim() ? `<span style="color:#15803d;font-weight:600">${bodyVariables[n]}</span>` : `<span style="color:#f87171">{{${n}}}</span>`) }} />
                        {Object.keys(bodyVariables).sort().map((key) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="w-8 shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-center text-[11px] font-bold text-green-700">{`{{${key}}}`}</span>
                            <input
                              value={bodyVariables[key]}
                              onChange={(e) => setBodyVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`Value for {{${key}}}`}
                              className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-green-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTemplate?.headerType === "IMAGE" && selectedTemplate?.header?.trim() && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-semibold text-gray-500">Header Image Preview</p>
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        <img
                          src={selectedTemplate.header.trim()}
                          alt="Header preview"
                          className="h-48 w-full object-contain"
                        />
                      </div>
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
                      <span className="font-semibold text-gray-800 capitalize">{audience === "all" ? "All Contacts" : `${selectedContactIds.length} selected`}</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Schedule (optional)</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      {scheduledAt ? `Will send on ${new Date(scheduledAt).toLocaleString()}` : "Leave empty to send immediately."}
                    </p>
                  </div>
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
                  disabled={step === 1 && selectedTemplate?.headerType === "IMAGE" && !canSendHeader}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:hover:bg-green-600"
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
                  {sending ? "Sending..." : scheduledAt ? "Schedule Broadcast" : "Send Broadcast"}
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
              <div className="flex items-center gap-2">
                {detail && (
                  <button
                    onClick={() => {
                      const lines = [
                        `Broadcast: ${detail.campaignName}`,
                        `Template: ${detail.templateName}`,
                        `Date: ${new Date(detail.createdAt).toLocaleString()}`,
                        `Total: ${detail.totalCount} | Sent: ${detail.sentCount} | Failed: ${detail.failedCount}`,
                        ``,
                        `${"-".repeat(60)}`,
                        `Phone                Status       Error Reason`,
                        `${"-".repeat(60)}`,
                        ...detail.logs.map((log) =>
                          `${log.phone.padEnd(20)} ${log.status.padEnd(12)} ${log.errorReason ?? "-"}`
                        ),
                      ];
                      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${detail.campaignName.replace(/\s+/g, "_")}_logs.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    Download .txt
                  </button>
                )}
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
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
                        <th className="px-3 py-2 text-left font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{log.phone}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${
                              log.status === "sent" ? "bg-green-100 text-green-700" :
                              log.status === "delivered" ? "bg-blue-100 text-blue-700" :
                              log.status === "read" ? "bg-purple-100 text-purple-700" :
                              "bg-red-100 text-red-600"
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-400 font-mono truncate max-w-[140px]">
                            {log.messageId ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-red-400 truncate max-w-[160px]" title={log.errorReason ?? ""}>
                            {log.errorReason ?? "—"}
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
