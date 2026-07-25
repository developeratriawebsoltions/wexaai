"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Shield, CheckCircle2, AlertCircle, Bell } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  workspaces: { id: string; name: string; slug: string; plan: string; status: string; role: string }[];
}

export default function ProfilePage() {
  const { token, loading, workspace } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notification settings state
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true,
    newConversation: true,
    whatsappAlerts: false,
    broadcastCompleted: true,
    paymentFailed: true,
  });

  useEffect(() => {
    if (!token) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name ?? "");
      });
  }, [token]);

  // Load notification settings
  useEffect(() => {
    if (!workspace?.id) return;
    fetch(`/api/settings/notifications?workspaceId=${workspace.id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setNotifSettings({
          emailNotifications: data.emailNotifications ?? true,
          newConversation: data.newConversation ?? true,
          whatsappAlerts: data.whatsappAlerts ?? false,
          broadcastCompleted: data.broadcastCompleted ?? true,
          paymentFailed: data.paymentFailed ?? true,
        });
      })
      .catch(() => {});
  }, [workspace?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const body: Record<string, string> = { name };
    if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setMsg({ type: "error", text: data.error }); return; }

    setProfile((p) => p ? { ...p, name: data.name } : p);
    setCurrentPassword(""); setNewPassword("");
    setMsg({ type: "success", text: "Profile updated successfully." });
  };

  const handleNotifSave = async () => {
    if (!workspace?.id) return;
    setNotifSaving(true);
    setNotifMsg(null);
    const res = await fetch(`/api/settings/notifications?workspaceId=${workspace.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifSettings),
    });
    setNotifSaving(false);
    if (res.ok) {
      setNotifMsg({ type: "success", text: "Notification settings saved." });
    } else {
      setNotifMsg({ type: "error", text: "Failed to save notification settings." });
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const initials = (profile.name ?? "").split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">My Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Avatar + basic info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{profile.name}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="mt-1 text-xs text-gray-400">
              Member since {new Date(profile.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-sm font-semibold text-gray-800">Edit Profile</p>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-gray-600">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input
                value={profile.email}
                disabled
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 outline-none cursor-not-allowed"
              />
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Change Password</p>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-gray-600">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-gray-600">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
            </div>

            {msg && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {msg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Notification Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-gray-500" />
            <p className="text-sm font-semibold text-gray-800">Notification Settings</p>
          </div>
          <div className="space-y-3">
            {[
              { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications via email" },
              { key: "newConversation", label: "New Conversation", desc: "Alert when a new conversation starts" },
              { key: "whatsappAlerts", label: "WhatsApp Alerts", desc: "Receive alerts on WhatsApp" },
              { key: "broadcastCompleted", label: "Broadcast Completed", desc: "Notify when a broadcast finishes" },
              { key: "paymentFailed", label: "Payment Failed", desc: "Alert on payment failures" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSettings((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifSettings[key as keyof typeof notifSettings] ? "bg-green-600" : "bg-gray-200"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${notifSettings[key as keyof typeof notifSettings] ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>

          {notifMsg && (
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${notifMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {notifMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {notifMsg.text}
            </div>
          )}

          <button
            onClick={handleNotifSave}
            disabled={notifSaving}
            className="mt-4 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {notifSaving ? "Saving..." : "Save Notifications"}
          </button>
        </div>

        {/* Workspaces */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-sm font-semibold text-gray-800">My Workspaces</p>
          <div className="space-y-3">
            {(profile.workspaces ?? []).map((ws) => (
              <div key={ws.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-xs font-bold text-white">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{ws.name}</p>
                    <p className="text-xs text-gray-400">/{ws.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                    ws.role === "owner" ? "bg-purple-100 text-purple-700" :
                    ws.role === "manager" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    <Shield size={10} className="inline mr-1" />{ws.role}
                  </span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium capitalize text-green-700">
                    {ws.plan}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
