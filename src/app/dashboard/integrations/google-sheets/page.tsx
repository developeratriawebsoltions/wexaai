"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Download, Trash2, CheckCircle2,
  AlertCircle, Clock, ToggleLeft, ToggleRight, ExternalLink,
  Radio, Zap, ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";

interface Integration {
  id: string;
  sheetUrl: string;
  sheetName: string;
  syncEnabled: boolean;
  syncInterval: number;
  exportEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number;
  appsScriptUrl?: string | null;
}

function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, credentials: "include", headers });
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

export default function GoogleSheetsPage() {
  const router = useRouter();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState(true);

  // form state
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("Sheet1");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(6);
  const [exportEnabled, setExportEnabled] = useState(false);

  // action states
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Broadcast from Sheet
  const [sheetBroadcastOpen, setSheetBroadcastOpen] = useState(false);
  const [broadcastSheetUrl, setBroadcastSheetUrl] = useState("");
  const [broadcastCampaign, setBroadcastCampaign] = useState("");
  const [broadcastTemplate, setBroadcastTemplate] = useState("");
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ campaignName: string; totalCount: number } | null>(null);

  // Two-way sync
  const [appsScriptUrl, setAppsScriptUrl] = useState("");
  const [savingScript, setSavingScript] = useState(false);
  const [scriptSaved, setScriptSaved] = useState(false);

  // Zapier
  const [zapierKey, setZapierKey] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/integrations/google-sheets")
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setIntegration(data);
          setSheetUrl(data.sheetUrl);
          setSheetName(data.sheetName);
          setSyncEnabled(data.syncEnabled);
          setSyncInterval(data.syncInterval);
          setExportEnabled(data.exportEnabled);
          setAppsScriptUrl(data.appsScriptUrl ?? "");
          setBroadcastSheetUrl(data.sheetUrl);
        }
      })
      .finally(() => setLoading(false));

    // Load templates for broadcast
    authFetch("/api/templates?status=APPROVED")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []));

    // Load API keys for Zapier
    authFetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length > 0) setZapierKey(d[0].key); });
  }, []);

  const save = async () => {
    setError("");
    if (!sheetUrl.trim()) { setError("Sheet URL is required"); return; }
    if (!sheetUrl.includes("docs.google.com/spreadsheets")) { setError("Please enter a valid Google Sheets URL"); return; }
    setSaving(true);
    const res = await authFetch("/api/integrations/google-sheets", {
      method: "POST",
      body: JSON.stringify({ sheetUrl, sheetName, syncEnabled, syncInterval, exportEnabled }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    setIntegration(data);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError("");
    const res = await authFetch("/api/integrations/google-sheets/sync", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) { setError(data.error ?? "Sync failed"); return; }
    setSyncResult(data);
    setIntegration((prev) => prev ? { ...prev, lastSyncedAt: new Date().toISOString(), lastSyncCount: data.imported } : prev);
  };

  const exportCSV = async () => {
    setExporting(true);
    const res = await authFetch("/api/integrations/google-sheets/export");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `wexa-contacts-${Date.now()}.csv`;
    a.click();
    setExporting(false);
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Google Sheets? This will remove the integration but keep your contacts.")) return;
    setDisconnecting(true);
    await authFetch("/api/integrations/google-sheets", { method: "DELETE" });
    setIntegration(null);
    setSheetUrl("");
    setDisconnecting(false);
  };

  const sendSheetBroadcast = async () => {
    setBroadcasting(true);
    setBroadcastResult(null);
    setError("");
    const res = await authFetch("/api/integrations/google-sheets/broadcast", {
      method: "POST",
      body: JSON.stringify({ sheetUrl: broadcastSheetUrl, campaignName: broadcastCampaign, templateName: broadcastTemplate }),
    });
    const data = await res.json();
    setBroadcasting(false);
    if (!res.ok) { setError(data.error ?? "Broadcast failed"); return; }
    setBroadcastResult(data);
    setBroadcastCampaign("");
  };

  const saveAppsScript = async () => {
    setSavingScript(true);
    const res = await authFetch("/api/integrations/google-sheets/two-way-sync", {
      method: "POST",
      body: JSON.stringify({ appsScriptUrl }),
    });
    setSavingScript(false);
    if (res.ok) { setScriptSaved(true); setTimeout(() => setScriptSaved(false), 3000); }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full pb-20">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/integrations" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg"
          alt="Google Sheets"
          className="h-7 w-7"
        />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Google Sheets</h1>
          <p className="text-xs text-gray-500">Sync contacts, leads and data automatically.</p>
        </div>
        {integration && (
          <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            Connected
          </span>
        )}
      </div>

      {/* How it works */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="mb-2 text-xs font-semibold text-blue-700">How to connect your Google Sheet:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-blue-600">
          <li>Open your Google Sheet with contacts</li>
          <li>Go to <strong>File → Share → Publish to web</strong></li>
          <li>Select your sheet and <strong>Comma-separated values (.csv)</strong> format</li>
          <li>Click <strong>Publish</strong> and paste the URL below</li>
        </ol>
        <p className="mt-2 text-xs text-blue-500">
          Sheet columns required: <span className="font-mono">name, phone, email, tags</span>
          {" "}(tags separated by |)
        </p>
        <a
          href="https://support.google.com/docs/answer/37579"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
        >
          View Google guide <ExternalLink size={11} />
        </a>
      </div>

      {/* Connection Form */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Connection Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Google Sheets URL *</label>
            <input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sheet Name</label>
            <input
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={13} /> {error}
          </div>
        )}
        {saveSuccess && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
            <CheckCircle2 size={13} /> Settings saved successfully!
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : integration ? "Update Settings" : "Connect Google Sheets"}
          </button>
        </div>
      </div>

      {/* Sync Settings — only show after connected */}
      {integration && (
        <>
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">Sync Settings</h2>

            <div className="space-y-4">
              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Auto Sync</p>
                  <p className="text-xs text-gray-400">Automatically import contacts from sheet on schedule</p>
                </div>
                <button onClick={() => setSyncEnabled(!syncEnabled)}>
                  {syncEnabled
                    ? <ToggleRight size={28} className="text-green-600" />
                    : <ToggleLeft size={28} className="text-gray-300" />}
                </button>
              </div>

              {/* Sync Interval */}
              {syncEnabled && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sync Every</label>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                  >
                    <option value={1}>1 hour</option>
                    <option value={3}>3 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>
              )}

              {/* Export Toggle */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Export to CSV</p>
                  <p className="text-xs text-gray-400">Allow exporting contacts as CSV for Google Sheets</p>
                </div>
                <button onClick={() => setExportEnabled(!exportEnabled)}>
                  {exportEnabled
                    ? <ToggleRight size={28} className="text-green-600" />
                    : <ToggleLeft size={28} className="text-gray-300" />}
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-800">Actions</h2>

            <div className="flex flex-wrap gap-3">
              {/* Manual Sync */}
              <button
                onClick={syncNow}
                disabled={syncing}
                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing..." : "Sync Now"}
              </button>

              {/* Export CSV */}
              <button
                onClick={exportCSV}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Download size={14} />
                {exporting ? "Exporting..." : "Export Contacts CSV"}
              </button>

              {/* Disconnect */}
              <button
                onClick={disconnect}
                disabled={disconnecting}
                className="ml-auto flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div className="mt-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <p className="text-sm font-semibold text-green-700">Sync Complete</p>
                </div>
                <div className="flex gap-5 text-xs text-gray-600">
                  <span>✅ Imported: <strong>{syncResult.imported}</strong></span>
                  <span>⏭ Skipped: <strong>{syncResult.skipped}</strong></span>
                  {syncResult.errors.length > 0 && (
                    <span className="text-red-500">❌ Errors: {syncResult.errors.length}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Last Sync Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Sync History</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span>Last synced: {integration.lastSyncedAt ? timeAgo(integration.lastSyncedAt) : "Never"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <span>Last count: <strong>{integration.lastSyncCount}</strong> contacts</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-gray-400" />
                <span>Auto sync: <strong>{integration.syncEnabled ? `Every ${integration.syncInterval}h` : "Off"}</strong></span>
              </div>
            </div>
          </div>

          {/* ── Feature 1: Broadcast from Sheet ── */}
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Radio size={16} className="text-green-600" />
              <h2 className="text-sm font-semibold text-gray-800">Broadcast from Sheet</h2>
            </div>
            <p className="mb-4 text-xs text-gray-500">Send WhatsApp template messages directly to contacts in your Sheet — no import needed.</p>

            {!sheetBroadcastOpen ? (
              <button
                onClick={() => setSheetBroadcastOpen(true)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Start Sheet Broadcast
              </button>
            ) : broadcastResult ? (
              <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <p className="text-sm font-semibold text-green-700">Broadcast Started!</p>
                </div>
                <p className="text-xs text-gray-600">Campaign: <strong>{broadcastResult.campaignName}</strong> — sending to <strong>{broadcastResult.totalCount}</strong> contacts from Sheet</p>
                <button onClick={() => { setSheetBroadcastOpen(false); setBroadcastResult(null); }} className="mt-3 text-xs text-green-600 hover:underline">Start another</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Sheet URL</label>
                  <input value={broadcastSheetUrl} onChange={(e) => setBroadcastSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Campaign Name</label>
                  <input value={broadcastCampaign} onChange={(e) => setBroadcastCampaign(e.target.value)}
                    placeholder="e.g. Diwali Offer 2025"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Template</label>
                  <select value={broadcastTemplate} onChange={(e) => setBroadcastTemplate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400">
                    <option value="">Select approved template...</option>
                    {templates.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setSheetBroadcastOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={sendSheetBroadcast} disabled={broadcasting || !broadcastCampaign || !broadcastTemplate}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                    <Radio size={13} />{broadcasting ? "Sending..." : "Send Broadcast"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Feature 2: Two-way Sync ── */}
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <ArrowLeftRight size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Two-way Sync</h2>
            </div>
            <p className="mb-3 text-xs text-gray-500">When a contact replies on WhatsApp, their status is automatically updated in your Google Sheet via Google Apps Script.</p>

            <div className="mb-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">Setup Steps:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                <li>Open your Google Sheet → Extensions → Apps Script</li>
                <li>Paste the script below and click Deploy → New Deployment → Web App</li>
                <li>Set access to <strong>Anyone</strong> → Copy the Web App URL</li>
                <li>Paste the URL below and save</li>
              </ol>
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold text-blue-700">View Apps Script code</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-white p-2 text-[10px] text-gray-700 border border-blue-100">{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var phoneCol = headers.indexOf('phone');
  var statusCol = headers.indexOf('status');
  var lastMsgCol = headers.indexOf('last_message');
  if (statusCol === -1) { sheet.getRange(1, headers.length+1).setValue('status'); statusCol = headers.length; }
  if (lastMsgCol === -1) { sheet.getRange(1, headers.length+1).setValue('last_message'); lastMsgCol = headers.length; }
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][phoneCol] && rows[i][phoneCol].toString().replace(/\\D/g,'') === data.phone.replace(/\\D/g,'')) {
      sheet.getRange(i+1, statusCol+1).setValue(data.status);
      sheet.getRange(i+1, lastMsgCol+1).setValue(data.lastMessage);
      break;
    }
  }
  return ContentService.createTextOutput('ok');
}`}</pre>
              </details>
            </div>

            <div className="flex gap-2">
              <input value={appsScriptUrl} onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
              <button onClick={saveAppsScript} disabled={savingScript || !appsScriptUrl}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {savingScript ? "Saving..." : "Save"}
              </button>
            </div>
            {scriptSaved && (
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 size={12} /> Two-way sync enabled!
              </div>
            )}
            {integration.appsScriptUrl && !scriptSaved && (
              <p className="mt-2 text-xs text-green-600">✅ Two-way sync is active</p>
            )}
          </div>

          {/* ── Feature 3: Zapier/Make Webhook ── */}
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Zap size={16} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-800">Zapier / Make Automation</h2>
            </div>
            <p className="mb-3 text-xs text-gray-500">Connect Zapier or Make to automatically send WhatsApp messages when a new row is added to Google Sheets.</p>

            <div className="mb-4 rounded-lg bg-orange-50 border border-orange-100 px-4 py-3 text-xs text-orange-700 space-y-1">
              <p className="font-semibold">Zapier Setup:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-orange-600">
                <li>Trigger: <strong>Google Sheets → New Row</strong></li>
                <li>Action: <strong>Webhooks by Zapier → POST</strong></li>
                <li>URL: <span className="font-mono bg-white px-1 rounded">{typeof window !== "undefined" ? window.location.origin : "https://yourapp.com"}/api/integrations/zapier</span></li>
                <li>Body (JSON): see format below</li>
              </ol>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-gray-600">Webhook URL:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white border border-gray-200 px-3 py-2 text-xs text-gray-700 font-mono">
                  {typeof window !== "undefined" ? window.location.origin : "https://yourapp.com"}/api/integrations/zapier
                </code>
                <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/integrations/zapier`)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100">Copy</button>
              </div>

              <p className="mt-3 mb-2 text-xs font-semibold text-gray-600">Request Body Format:</p>
              <pre className="rounded bg-white border border-gray-200 px-3 py-2 text-[11px] text-gray-700 overflow-x-auto">{`{
  "apiKey": "${zapierKey ?? "your-api-key"}",
  "phone": "919876543210",
  "name": "John Doe",
  "templateName": "your_template_name",
  "variables": { "1": "John", "2": "Order #123" }
}`}</pre>

              {zapierKey ? (
                <p className="mt-2 text-xs text-green-600">✅ Your API Key: <span className="font-mono">{zapierKey.slice(0, 12)}...</span></p>
              ) : (
                <p className="mt-2 text-xs text-orange-600">⚠️ No API key found. Go to Settings → API Keys to create one.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
