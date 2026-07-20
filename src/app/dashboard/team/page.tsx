"use client";

import { useEffect, useState } from "react";
import { Search, Edit2, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

const ROLES = ["owner", "manager", "agent"] as const;

export default function TeamPage() {
  const { token, workspace } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "agent">("agent");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = () => {
    if (!token || !workspace) return;
    fetch(`/api/workspace/members?workspaceId=${workspace.id}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => { setMembers(Array.isArray(data) ? data : []); setLoading(false); });
  };

  useEffect(() => { fetchMembers(); }, [token, workspace]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true); setError("");
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace?.id, email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowInvite(false); setInviteEmail(""); setInviteRole("agent");
    fetchMembers();
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this member?")) return;
    await fetch("/api/workspace/members", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspace?.id, userId }),
    });
    fetchMembers();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Team</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search members..." className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          >
            + Invite Member
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-3 py-3 text-left font-medium">Email</th>
                  <th className="px-3 py-3 text-left font-medium">Role</th>
                  <th className="px-3 py-3 text-left font-medium">Joined</th>
                  <th className="px-3 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const initials = m.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
                            {initials}
                          </div>
                          <p className="font-medium text-gray-800">{m.user.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{m.user.email}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                          m.role === "owner" ? "bg-purple-100 text-purple-700" :
                          m.role === "manager" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{m.role}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">
                        {new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3">
                        {m.role !== "owner" && (
                          <button onClick={() => handleRemove(m.user.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Invite Team Member</p>
              <button onClick={() => { setShowInvite(false); setError(""); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-gray-600">Email address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-gray-600">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "manager" | "agent")}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowInvite(false); setError(""); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={inviting} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                  {inviting ? "Inviting..." : "Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
