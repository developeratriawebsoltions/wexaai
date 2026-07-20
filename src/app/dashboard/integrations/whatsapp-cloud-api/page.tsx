"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Info, Eye, EyeOff, Copy, RefreshCw, Save, ChevronRight,
  Headphones, ExternalLink, Lightbulb, CheckCircle2, XCircle, Loader2,
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

function CopyField({ value, label, hint }: { value: string; label: string; hint: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {label} <span className="text-xs font-normal text-gray-400">(Read Only)</span>
      </label>
      <div className="flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <span className="flex-1 text-sm text-gray-600 truncate">{value}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 shrink-0"
        >
          <Copy size={14} /> {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}

type ConnectionStatus = "idle" | "verifying" | "saving" | "connected" | "error";

interface ConnectedAccount {
  id: string;
  businessName: string;
  phoneNumberId: string;
  wabaId: string;
  status: string;
  createdAt: string;
}

export default function WhatsAppCloudAPIPage() {
  const [businessName, setBusinessName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [account, setAccount] = useState<ConnectedAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/meta`;
  const verifyToken = "wexa_verify_2026";

  // Load existing connection on mount
  useEffect(() => {
    authFetch("/api/integrations/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data?.id) {
          setAccount(data);
          setBusinessName(data.businessName);
          setPhoneNumberId(data.phoneNumberId);
          setWabaId(data.wabaId);
        }
      })
      .finally(() => setLoadingAccount(false));
  }, []);

  const handleVerify = async () => {
    if (!phoneNumberId || !accessToken) {
      setErrorMsg("Phone Number ID and Access Token are required to verify.");
      setConnStatus("error");
      return;
    }
    setConnStatus("verifying");
    setErrorMsg("");

    // Quick Meta API check directly from browser (no credentials saved yet)
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name&access_token=${accessToken}`
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      setErrorMsg(data.error?.message ?? "Verification failed. Check your credentials.");
      setConnStatus("error");
    } else {
      setConnStatus("idle");
      alert(`✅ Verified! Phone: ${data.display_phone_number} — ${data.verified_name}`);
    }
  };

  const handleSave = async () => {
    if (!businessName || !phoneNumberId || !wabaId || !accessToken) {
      setErrorMsg("All fields are required.");
      setConnStatus("error");
      return;
    }
    setConnStatus("saving");
    setErrorMsg("");

    const res = await authFetch("/api/integrations/whatsapp", {
      method: "POST",
      body: JSON.stringify({ businessName, phoneNumberId, wabaId, accessToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      setErrorMsg(data.error ?? "Failed to save. Please try again.");
      setConnStatus("error");
    } else {
      setAccount(data);
      setConnStatus("connected");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;
    await authFetch("/api/integrations/whatsapp", {
      method: "DELETE",
    });
    setAccount(null);
    setConnStatus("idle");
    setAccessToken("");
  };

  const isConnected = account?.status === "active" || connStatus === "connected";

  const statusItems = [
    { label: "Business Details", ok: !!businessName },
    { label: "Access Token", ok: !!accessToken },
    { label: "Webhook", ok: isConnected },
    { label: "Permissions", ok: isConnected },
  ];

  const steps = [
    "Go to Meta Developers > My Apps",
    "Select your App and go to WhatsApp > API Setup",
    "Copy Webhook URL and Verify Token above",
    "Fill in the details and click Verify Connection",
    "Click Save & Connect to complete the setup",
  ];

  return (
    <div className="p-6 w-full overflow-y-auto">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <ChevronRight size={14} />
        <Link href="/dashboard/integrations" className="hover:text-gray-700">Integrations</Link>
        <ChevronRight size={14} />
        <span className="text-gray-900">WhatsApp Cloud API</span>
      </nav>

      {/* Page Header */}
      <div className="mb-5 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500">
          <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Cloud API</h1>
          <p className="text-sm text-gray-500">Connect your WhatsApp Business account to start sending and receiving messages.</p>
        </div>
      </div>

      {/* Help Banner */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Lightbulb size={16} className="text-yellow-500" />
          <span><span className="font-semibold">Need help?</span> Follow our step-by-step guide to connect WhatsApp Cloud API.</span>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50">
          View Guide <ExternalLink size={13} />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Connect Your WhatsApp Business</h2>
            {isConnected && (
              <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                <CheckCircle2 size={13} /> Connected
              </span>
            )}
          </div>

          {loadingAccount ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Business Name <Info size={13} className="text-gray-400" />
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. ABC Electronics"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Phone Number ID <Info size={13} className="text-gray-400" />
                </label>
                <input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 123456789012345"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
                />
                <p className="mt-1 text-xs text-gray-400">Found in Meta Developer Portal → WhatsApp → API Setup.</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  WhatsApp Business Account ID <span className="text-gray-400">(WABA ID)</span>
                </label>
                <input
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="e.g. 987654321098765"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Permanent Access Token <Info size={13} className="text-gray-400" />
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 px-3 py-2.5 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-100">
                  <input
                    type={showToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxxxxxxxxx..."
                    className="flex-1 text-sm outline-none"
                  />
                  <button onClick={() => setShowToken(!showToken)} className="text-gray-400 hover:text-gray-600">
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">Generate a permanent token from Meta Business Suite → System Users.</p>
              </div>

              <CopyField value={webhookUrl} label="Webhook URL" hint="Paste this in Meta App → WhatsApp → Configuration → Webhook URL." />
              <CopyField value={verifyToken} label="Verify Token" hint="Paste this in Meta App → WhatsApp → Configuration → Verify Token." />

              {/* Error message */}
              {connStatus === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <XCircle size={15} /> {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleVerify}
              disabled={connStatus === "verifying"}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={15} className={connStatus === "verifying" ? "animate-spin" : ""} />
              {connStatus === "verifying" ? "Verifying..." : "Verify Connection"}
            </button>
            <button
              onClick={handleSave}
              disabled={connStatus === "saving"}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {connStatus === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {connStatus === "saving" ? "Saving..." : "Save & Connect"}
            </button>
          </div>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="mt-3 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Disconnect WhatsApp
            </button>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            🔒 Your credentials are encrypted and stored securely.
          </p>
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Connection Status</h3>
            <div className={`mb-4 flex items-center gap-3 rounded-lg p-3 ${isConnected ? "bg-green-50" : "bg-gray-50"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isConnected ? "bg-green-600" : "bg-gray-300"}`}>
                {isConnected ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <XCircle size={16} className="text-white" />
                )}
              </div>
              <div>
                <p className={`text-sm font-semibold ${isConnected ? "text-green-700" : "text-gray-600"}`}>
                  {isConnected ? `Connected — ${account?.businessName ?? businessName}` : "Not Connected"}
                </p>
                <p className="text-xs text-gray-500">
                  {isConnected ? "Your WhatsApp is live and receiving messages." : "Connect your account to start using WhatsApp features."}
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {statusItems.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`h-4 w-4 rounded-full border-2 ${s.ok ? "border-green-500 bg-green-500" : "border-gray-300"}`} />
                    {s.label}
                  </div>
                  <span className={`text-xs font-medium ${s.ok ? "text-green-600" : "text-gray-400"}`}>
                    {s.ok ? "Connected" : "Not Connected"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How to Connect */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">How to Connect?</h3>
            <ol className="space-y-2.5">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-600 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Need Help */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <Headphones size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Need Help?</p>
                <p className="mt-0.5 text-xs text-gray-500">Facing issues while connecting WhatsApp Cloud API?</p>
              </div>
            </div>
            <button className="mt-3 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Contact Support <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
