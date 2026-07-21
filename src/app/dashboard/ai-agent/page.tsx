"use client";

import { useEffect, useState } from "react";
import { Search, Bell, Bot, Pause, Plus, Trash2 } from "lucide-react";

const TABS = ["Overview", "Knowledge Base", "Settings", "Conversation Logs"];

function authFetch(url: string, options: RequestInit = {}) {
  return fetch(url, { ...options, credentials: "include" });
}

export default function AIAgentPage() {
  const [activeTab, setActiveTab] = useState(0);

  // Settings state
  const [agent, setAgent] = useState({
    name: "Wexa Assistant",
    systemPrompt: "You are a helpful customer support assistant.",
    model: "gpt-4o-mini",
    temperature: 0.5,
    language: "English",
    autoReply: false,
    fallbackType: "assign_human",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Knowledge Base state
  const [knowledge, setKnowledge] = useState<{ id: string; title: string; content: string; type: string }[]>([]);
  const [kbForm, setKbForm] = useState({ title: "", content: "", type: "FAQ" });
  const [kbAdding, setKbAdding] = useState(false);

  // Overview stats
  const [overviewStats, setOverviewStats] = useState<{ needsAttention: number; knowledgeCount: number; messagesSent: number; conversationsCount: number; messagesSentChange: string } | null>(null);
  const [conversationLogs, setConversationLogs] = useState<Array<{ id: string; contactPhone: string; contactName: string | null; lastMessage: string; lastMessageAt: string; unreadCount: number; status: string; assignedTo: string | null }>>([]);

  useEffect(() => {
    authFetch("/api/ai-agent")
      .then((r) => r.json())
      .then((d) => {
        if (d.id) setAgent({ name: d.name, systemPrompt: d.systemPrompt, model: d.model, temperature: d.temperature, language: d.language, autoReply: d.autoReply, fallbackType: d.fallbackType });
      });
    authFetch("/api/knowledge")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setKnowledge(d));
    authFetch("/api/overview")
      .then((r) => r.json())
      .then((d) => d.aiAgent && setOverviewStats({ needsAttention: d.aiAgent.needsAttention, knowledgeCount: d.aiAgent.knowledgeCount, messagesSent: d.stats?.totalOutboundMessages ?? 0, conversationsCount: d.stats?.totalConversations ?? 0, messagesSentChange: d.stats?.outboundMsgChange ?? "0%" }));

    async function loadConversationLogs() {
      const res = await authFetch("/api/conversations?limit=50");
      const data = await res.json();
      const conversations = Array.isArray(data.conversations) ? data.conversations : [];

      const filtered = await Promise.all(
        conversations.map(async (conversation: { id: string; contactPhone: string; contactName: string | null; lastMessage: string; lastMessageAt: string; unreadCount: number; status: string; assignedTo: string | null }) => {
          const msgRes = await authFetch(`/api/messages?conversationId=${conversation.id}`);
          const messages = await msgRes.json();
          const aiReplies = Array.isArray(messages)
            ? messages.filter((msg: { direction?: string; from?: string }) => msg.direction === "outbound" && msg.from === "AI")
            : [];

          if (aiReplies.length === 0) return null;

          const latestReply = aiReplies[aiReplies.length - 1];
          return {
            ...conversation,
            lastMessage: latestReply.text || conversation.lastMessage,
            lastMessageAt: latestReply.createdAt || conversation.lastMessageAt,
          };
        })
      );

      setConversationLogs(filtered.filter(Boolean) as Array<{ id: string; contactPhone: string; contactName: string | null; lastMessage: string; lastMessageAt: string; unreadCount: number; status: string; assignedTo: string | null }>);
    }

    loadConversationLogs();
  }, []);

  async function saveSettings() {
    setSaving(true);
    await authFetch("/api/ai-agent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agent),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addKnowledge() {
    if (!kbForm.title || !kbForm.content) return;
    setKbAdding(true);
    const res = await authFetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kbForm),
    });
    const item = await res.json();
    setKnowledge((prev) => [item, ...prev]);
    setKbForm({ title: "", content: "", type: "FAQ" });
    setKbAdding(false);
  }

  async function deleteKnowledge(id: string) {
    await authFetch(`/api/knowledge/${id}`, { method: "DELETE" });
    setKnowledge((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">AI Agent</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search anything..." className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
          </div>
          <button className="text-gray-400 hover:text-gray-600"><Bell size={18} /></button>
          <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">⚡ Train AI</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 bg-white rounded-t-xl px-4 pt-3">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setActiveTab(i)}
              className={`pb-2.5 px-3 text-xs font-medium transition border-b-2 ${i === activeTab ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-sm font-semibold text-gray-800">Agent Status</p>
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${agent.autoReply ? "bg-green-50" : "bg-gray-100"}`}>
                    <Bot size={32} className={agent.autoReply ? "text-green-600" : "text-gray-400"} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${agent.autoReply ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                      <span className={`text-sm font-semibold ${agent.autoReply ? "text-green-600" : "text-gray-500"}`}>
                        {agent.autoReply ? "Auto Reply ON" : "Auto Reply OFF"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{agent.name} · {agent.model}</p>
                    <button
                      onClick={async () => {
                        const updated = { ...agent, autoReply: !agent.autoReply };
                        setAgent(updated);
                        await authFetch("/api/ai-agent", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(updated),
                        });
                        setActiveTab(2);
                      }}
                      className="mt-3 flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Pause size={12} /> {agent.autoReply ? "Pause Agent" : "Enable Agent"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-sm font-semibold text-gray-800">Live Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Knowledge Entries", value: overviewStats ? String(overviewStats.knowledgeCount) : "—" },
                    { label: "Needs Attention", value: overviewStats ? String(overviewStats.needsAttention) : "—" },
                    { label: "Messages Sent", value: overviewStats ? String(overviewStats.messagesSent) : "—", hint: overviewStats?.messagesSentChange },
                    { label: "Conversations", value: overviewStats ? String(overviewStats.conversationsCount) : "—" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-gray-400 leading-tight">{m.label}</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{m.value}</p>
                      {m.hint ? <p className="mt-1 text-[10px] font-medium text-green-600">{m.hint}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Knowledge Base Overview</p>
                  <button onClick={() => setActiveTab(1)} className="text-xs text-green-600 hover:underline">Manage Knowledge</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Entries", value: String(knowledge.length) },
                    { label: "FAQ", value: String(knowledge.filter((k) => k.type === "FAQ").length) },
                    { label: "Other Types", value: String(knowledge.filter((k) => k.type !== "FAQ").length) },
                  ].map((k) => (
                    <div key={k.label} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-gray-400">{k.label}</p>
                      <p className="mt-1 text-base font-bold text-gray-800">{k.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="mb-4 text-sm font-semibold text-gray-800">Recent Knowledge</p>
                <div className="space-y-2">
                  {knowledge.length === 0 && <p className="text-xs text-gray-400">No knowledge entries yet.</p>}
                  {knowledge.slice(0, 4).map((k) => (
                    <div key={k.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-700 truncate max-w-[160px]">{k.title}</span>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{k.type}</span>
                    </div>
                  ))}
                  {knowledge.length > 4 && (
                    <button onClick={() => setActiveTab(1)} className="text-xs text-green-600 hover:underline">+{knowledge.length - 4} more</button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 1 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-800">Knowledge Base</p>

            {/* Add form */}
            <div className="grid grid-cols-3 gap-3 border border-gray-100 rounded-lg p-4 bg-gray-50">
              <input
                placeholder="Title (e.g. Shipping Policy)"
                value={kbForm.title}
                onChange={(e) => setKbForm((p) => ({ ...p, title: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
              <input
                placeholder="Content (e.g. Delivery takes 3 days)"
                value={kbForm.content}
                onChange={(e) => setKbForm((p) => ({ ...p, content: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
              <div className="flex gap-2">
                <select
                  value={kbForm.type}
                  onChange={(e) => setKbForm((p) => ({ ...p, type: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                >
                  <option>FAQ</option>
                  <option>Policy</option>
                  <option>Product</option>
                  <option>Other</option>
                </select>
                <button
                  onClick={addKnowledge}
                  disabled={kbAdding}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {knowledge.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No knowledge base entries yet. Add your first one above.</p>}
              {knowledge.map((k) => (
                <div key={k.id} className="flex items-start justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">{k.title}</span>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{k.type}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{k.content}</p>
                  </div>
                  <button onClick={() => deleteKnowledge(k.id)} className="text-gray-300 hover:text-red-500 ml-3 mt-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 2 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 max-w-xl space-y-4">
            <p className="text-sm font-semibold text-gray-800">AI Agent Settings</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Agent Name</label>
                <input
                  value={agent.name}
                  onChange={(e) => setAgent((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">System Prompt</label>
                <textarea
                  rows={4}
                  value={agent.systemPrompt}
                  onChange={(e) => setAgent((p) => ({ ...p, systemPrompt: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Model</label>
                  <select
                    value={agent.model}
                    onChange={(e) => setAgent((p) => ({ ...p, model: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                  >
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    <option value="gemma2-9b-it">Gemma 2 9B</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Temperature ({agent.temperature})</label>
                  <input
                    type="range" min={0} max={1} step={0.1}
                    value={agent.temperature}
                    onChange={(e) => setAgent((p) => ({ ...p, temperature: parseFloat(e.target.value) }))}
                    className="mt-2 w-full accent-green-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Language</label>
                  <select
                    value={agent.language}
                    onChange={(e) => setAgent((p) => ({ ...p, language: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                  >
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Hinglish</option>
                    <option>Arabic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Fallback</label>
                  <select
                    value={agent.fallbackType}
                    onChange={(e) => setAgent((p) => ({ ...p, fallbackType: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                  >
                    <option value="assign_human">Assign Human</option>
                    <option value="ignore">Ignore</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Auto Reply</p>
                  <p className="text-xs text-gray-500">AI will automatically reply to incoming messages</p>
                </div>
                <button
                  onClick={() => setAgent((p) => ({ ...p, autoReply: !p.autoReply }))}
                  className={`relative h-6 w-11 rounded-full transition-colors ${agent.autoReply ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${agent.autoReply ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Settings"}
            </button>
          </div>
        )}

        {/* Conversation Logs Tab */}
        {activeTab === 3 && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">AI Reply Conversation Logs</p>
              <span className="text-xs text-gray-500">Showing {conversationLogs.length} AI-replied conversations</span>
            </div>

            {conversationLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">No conversation activity yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversationLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{log.contactName || log.contactPhone}</p>
                        <p className="text-xs text-gray-500">{log.contactPhone}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${log.status === "needs_attention" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                        {log.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{log.lastMessage || "No message yet"}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{log.lastMessageAt ? new Date(log.lastMessageAt).toLocaleString() : "—"}</span>
                      <span>Unread: {log.unreadCount} · Assigned: {log.assignedTo ? log.assignedTo : "Unassigned"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
