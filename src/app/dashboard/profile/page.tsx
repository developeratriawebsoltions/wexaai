"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Shield, CheckCircle2, AlertCircle } from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  workspaces: { id: string; name: string; slug: string; plan: string; status: string; role: string }[];
}

export default function ProfilePage() {
  const { token, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setName(data.name);
      });
  }, [token]);

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

  if (loading || !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const initials = profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

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

        {/* Workspaces */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="mb-4 text-sm font-semibold text-gray-800">My Workspaces</p>
          <div className="space-y-3">
            {profile.workspaces.map((ws) => (
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
