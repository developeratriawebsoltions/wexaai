"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Edit2, Trash2, X, Plus, RefreshCw } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  createdAt: string;
}

const TAG_COLORS: Record<string, string> = {
  Customer: "bg-green-100 text-green-700",
  Lead: "bg-blue-100 text-blue-700",
  VIP: "bg-purple-100 text-purple-700",
  Prospect: "bg-yellow-100 text-yellow-700",
};

const AVATAR_COLORS = [
  "bg-orange-400", "bg-purple-400", "bg-blue-400",
  "bg-pink-400", "bg-teal-400", "bg-red-400", "bg-indigo-400", "bg-yellow-500",
];

function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? "bg-gray-100 text-gray-600";
}

function avatarColor(phone: string) {
  return AVATAR_COLORS[phone.charCodeAt(phone.length - 1) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface ContactModalProps {
  contact?: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}

function ContactModal({ contact, onClose, onSaved }: ContactModalProps) {
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(contact?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const save = async () => {
    setError("");
    if (!phone.trim()) { setError("Phone is required"); return; }
    setSaving(true);

    const res = contact
      ? await authFetch(`/api/contacts/${contact.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, email, tags }),
        })
      : await authFetch("/api/contacts", {
          method: "POST",
          body: JSON.stringify({ name, phone, email, tags }),
        });

    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed to save"); setSaving(false); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{contact ? "Edit Contact" : "Add Contact"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="919876543210" disabled={!!contact}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 disabled:bg-gray-50 disabled:text-gray-400" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com" type="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span key={t} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tagColor(t)}`}>
                  {t}
                  <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))}><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400" />
              <button onClick={addTag} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200">Add</button>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [modal, setModal] = useState<{ open: boolean; contact?: Contact | null }>({ open: false });
  const [deleting, setDeleting] = useState<string | null>(null);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.set("search", search);
    if (tagFilter) params.set("tag", tagFilter);
    const res = await authFetch(`/api/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search, tagFilter]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, tagFilter]);

  const toggleSelect = (id: string) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const toggleAll = () =>
    setSelected(selected.length === contacts.length ? [] : contacts.map((c) => c.id));

  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    setDeleting(id);
    const res = await authFetch(`/api/contacts/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete contact");
      return;
    }
    fetchContacts();
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.length} contacts?`)) return;
    await Promise.all(selected.map((id) => authFetch(`/api/contacts/${id}`, { method: "DELETE" })));
    setSelected([]);
    fetchContacts();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Contacts</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anything..."
              className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-xl border border-gray-200 bg-white">
          {/* Table header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                All Contacts <span className="text-gray-400">({total.toLocaleString()})</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {selected.length > 0 && (
                <button onClick={deleteSelected}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                  Delete ({selected.length})
                </button>
              )}
              <button onClick={fetchContacts} className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:bg-gray-50">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => setModal({ open: true, contact: null })}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
                <Plus size={13} /> Add Contact
              </button>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 w-56">
              <Search size={13} className="text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400 w-full" />
            </div>
            <div className="flex items-center gap-2">
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none">
                <option value="">All Tags</option>
                <option>Customer</option>
                <option>Lead</option>
                <option>VIP</option>
                <option>Prospect</option>
              </select>
              {tagFilter && (
                <button onClick={() => setTagFilter("")} className="text-xs text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-gray-500">No contacts found</p>
              <p className="mt-1 text-xs text-gray-400">
                {search || tagFilter ? "Try adjusting your filters" : "Contacts will appear here when customers message you on WhatsApp"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left w-8">
                    <input type="checkbox" checked={selected.length === contacts.length && contacts.length > 0}
                      onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="px-3 py-3 text-left font-medium">Name</th>
                  <th className="px-3 py-3 text-left font-medium">Phone</th>
                  <th className="px-3 py-3 text-left font-medium">Email</th>
                  <th className="px-3 py-3 text-left font-medium">Tags</th>
                  <th className="px-3 py-3 text-left font-medium">Added</th>
                  <th className="px-3 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <input type="checkbox" checked={selected.includes(c.id)}
                        onChange={() => toggleSelect(c.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColor(c.phone)}`}>
                          {initials(c.name)}
                        </div>
                        <span className="font-medium text-gray-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{c.phone}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{c.email ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length > 0
                          ? c.tags.map((t) => (
                              <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tagColor(t)}`}>{t}</span>
                            ))
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{timeAgo(c.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <button onClick={() => setModal({ open: true, contact: c })}
                          className="hover:text-green-600"><Edit2 size={14} /></button>
                        <button onClick={() => deleteContact(c.id)} disabled={deleting === c.id}
                          className="hover:text-red-500 disabled:opacity-40">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-400">
              <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}</span>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="rounded px-2.5 py-1 hover:bg-gray-100 disabled:opacity-40">←</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`rounded px-2.5 py-1 ${p === page ? "bg-green-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                  className="rounded px-2.5 py-1 hover:bg-gray-100 disabled:opacity-40">→</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <ContactModal
          contact={modal.contact}
          onClose={() => setModal({ open: false })}
          onSaved={fetchContacts}
        />
      )}
    </div>
  );
}
