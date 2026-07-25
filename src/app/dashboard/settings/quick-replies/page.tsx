"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, X, Search, Zap } from "lucide-react";

interface QuickReply {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, credentials: "include", headers });
}

function Modal({
  reply,
  onClose,
  onSaved,
}: {
  reply?: QuickReply | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(reply?.title ?? "");
  const [message, setMessage] = useState(reply?.message ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim() || !message.trim()) { setError("Both fields are required"); return; }
    setSaving(true);
    const res = reply
      ? await authFetch(`/api/quick-replies/${reply.id}`, { method: "PATCH", body: JSON.stringify({ title, message }) })
      : await authFetch("/api/quick-replies", { method: "POST", body: JSON.stringify({ title, message }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSaving(false); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{reply ? "Edit Quick Reply" : "New Quick Reply"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Shortcut Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. greeting, pricing, hours"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
            />
            <p className="mt-1 text-[11px] text-gray-400">Type / in inbox to search quick replies</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type the full message..."
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 resize-none"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuickRepliesPage() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; reply?: QuickReply | null }>({ open: false });
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await authFetch(`/api/quick-replies?${params}`);
    if (res.ok) setReplies(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  const deleteReply = async (id: string) => {
    if (!confirm("Delete this quick reply?")) return;
    setDeleting(id);
    await authFetch(`/api/quick-replies/${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchReplies();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-green-600" />
          <h1 className="text-[15px] font-semibold text-gray-800">Quick Replies</h1>
        </div>
        <button
          onClick={() => setModal({ open: true, reply: null })}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
        >
          <Plus size={13} /> New Quick Reply
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Saved Replies</p>
              <p className="text-xs text-gray-400 mt-0.5">Type / in the inbox chat box to quickly insert these messages</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
              <Search size={13} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search replies..."
                className="bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400 w-36"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            </div>
          ) : replies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Zap size={32} className="mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No quick replies yet</p>
              <p className="mt-1 text-xs text-gray-400">Create shortcuts to send common messages faster</p>
              <button
                onClick={() => setModal({ open: true, reply: null })}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
              >
                <Plus size={13} /> Create First Quick Reply
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {replies.map((r) => (
                <div key={r.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">/{r.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{r.message}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 flex-shrink-0">
                    <button onClick={() => setModal({ open: true, reply: r })} className="hover:text-green-600">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteReply(r.id)} disabled={deleting === r.id} className="hover:text-red-500 disabled:opacity-40">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <Modal reply={modal.reply} onClose={() => setModal({ open: false })} onSaved={fetchReplies} />
      )}
    </div>
  );
}
