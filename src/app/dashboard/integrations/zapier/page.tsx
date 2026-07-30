"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Copy, CheckCircle2, ExternalLink, AlertCircle, Plus, Trash2 } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, credentials: "include", headers });
}

export default function ZapierPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/integrations/zapier`
    : "https://yourapp.com/api/integrations/zapier";

  useEffect(() => {
    authFetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((d) => setApiKeys(Array.isArray(d?.data) ? d.data : []))
      .finally(() => setLoading(false));
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const createKey = async () => {
    if (!newKeyName.trim()) { setError("Key name is required"); return; }
    setCreating(true);
    setError("");
    const res = await authFetch("/api/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ name: newKeyName }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error ?? "Failed to create key"); return; }
    setNewlyCreatedKey(data.data.key);
    setApiKeys((prev) => [...prev, { id: data.data.id, name: data.data.name, key: data.data.key, createdAt: data.data.createdAt }]);
    setNewKeyName("");
    setShowCreate(false);
  };

  const deleteKey = async (id: string) => {
    if (!confirm("Delete this API key? Zapier zaps using this key will stop working.")) return;
    await authFetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    if (newlyCreatedKey) setNewlyCreatedKey(null);
  };

  const activeKey = apiKeys[0];

  const sampleBody = JSON.stringify({
    apiKey: activeKey?.key ?? "your-api-key",
    phone: "919876543210",
    name: "John Doe",
    templateName: "your_template_name",
    variables: { "1": "John", "2": "Order #123" },
  }, null, 2);

  return (
    <div className="p-6 max-w-3xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/integrations" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 border border-orange-100">
          <Zap size={20} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Zapier</h1>
          <p className="text-xs text-gray-500">Automate WhatsApp messages with 6,000+ apps.</p>
        </div>
        <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          Active
        </span>
      </div>

      {/* How it works */}
      <div className="mb-5 rounded-xl border border-orange-100 bg-orange-50 px-5 py-4">
        <p className="mb-2 text-xs font-semibold text-orange-700">How Zapier Integration Works:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-orange-600">
          <li>Create a Zap in Zapier with <strong>Google Sheets → New Row</strong> as trigger</li>
          <li>Add action: <strong>Webhooks by Zapier → POST</strong></li>
          <li>Paste the Webhook URL below and set body as JSON</li>
          <li>Use your API Key to authenticate requests</li>
        </ol>
        <a
          href="https://zapier.com/apps/webhook/integrations"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline"
        >
          Open Zapier <ExternalLink size={11} />
        </a>
      </div>

      {/* Webhook URL */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Webhook URL</h2>
        <p className="mb-3 text-xs text-gray-500">Paste this URL in Zapier's Webhooks action as the POST endpoint.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700 break-all">
            {webhookUrl}
          </code>
          <button
            onClick={() => copyText(webhookUrl, "webhook")}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
          >
            {copiedId === "webhook" ? <CheckCircle2 size={13} className="text-green-600" /> : <Copy size={13} />}
            {copiedId === "webhook" ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Request Body Format */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Request Body Format</h2>
        <p className="mb-3 text-xs text-gray-500">Send this JSON body in your Zapier Webhook POST action.</p>
        <div className="relative">
          <pre className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-[11px] text-gray-700 overflow-x-auto">
            {sampleBody}
          </pre>
          <button
            onClick={() => copyText(sampleBody, "body")}
            className="absolute right-2 top-2 flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50"
          >
            {copiedId === "body" ? <CheckCircle2 size={11} className="text-green-600" /> : <Copy size={11} />}
            {copiedId === "body" ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          <p><span className="font-mono text-gray-700">apiKey</span> — Your Wexa API key (required)</p>
          <p><span className="font-mono text-gray-700">phone</span> — Recipient phone with country code, e.g. 919876543210 (required)</p>
          <p><span className="font-mono text-gray-700">name</span> — Contact name (optional)</p>
          <p><span className="font-mono text-gray-700">templateName</span> — Approved WhatsApp template name (required)</p>
          <p><span className="font-mono text-gray-700">variables</span> — Template body variables as {"{ \"1\": \"value\" }"} (optional)</p>
        </div>
      </div>

      {/* API Keys */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">API Keys</h2>
            <p className="text-xs text-gray-500 mt-0.5">Use these keys to authenticate Zapier webhook requests.</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setError(""); }}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
          >
            <Plus size={13} /> New Key
          </button>
        </div>

        {/* New key just created — show full key once */}
        {newlyCreatedKey && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={13} className="text-green-600" />
              <p className="text-xs font-semibold text-green-700">API Key Created — copy it now, it won't be shown again.</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 rounded border border-green-200 bg-white px-2 py-1.5 text-xs font-mono text-gray-700 break-all">
                {newlyCreatedKey}
              </code>
              <button
                onClick={() => copyText(newlyCreatedKey, "newkey")}
                className="flex items-center gap-1 rounded border border-green-200 bg-white px-2 py-1.5 text-xs text-green-700 hover:bg-green-50 whitespace-nowrap"
              >
                {copiedId === "newkey" ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                {copiedId === "newkey" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="mb-4 flex gap-2">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              placeholder="Key name, e.g. Zapier Production"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              autoFocus
            />
            <button
              onClick={createKey}
              disabled={creating}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(""); }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={13} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
            <Zap size={20} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No API keys yet.</p>
            <p className="text-xs text-gray-400">Create one to start using Zapier.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{k.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{k.key}...</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyText(k.key, k.id)}
                    className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    {copiedId === k.id ? <CheckCircle2 size={11} className="text-green-600" /> : <Copy size={11} />}
                    {copiedId === k.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="rounded border border-red-100 bg-red-50 p-1.5 text-red-400 hover:bg-red-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
