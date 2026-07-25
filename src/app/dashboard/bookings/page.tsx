"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";

interface Contact { id: string; name: string; phone: string; }
interface Booking {
  id: string;
  title: string;
  date: string;
  duration: number;
  status: string;
  notes: string | null;
  contact: Contact;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled:  { label: "Scheduled",  color: "bg-blue-100 text-blue-700",   icon: <Clock size={11} /> },
  completed:  { label: "Completed",  color: "bg-green-100 text-green-700", icon: <CheckCircle size={11} /> },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-600",     icon: <XCircle size={11} /> },
  no_show:    { label: "No Show",    color: "bg-gray-100 text-gray-500",   icon: <AlertCircle size={11} /> },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function BookingsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // "YYYY-MM-DD"
  const [showModal, setShowModal] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [form, setForm] = useState({ contactId: "", title: "Meeting", date: "", time: "10:00", duration: 30, notes: "" });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings?month=${monthKey}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings);
    }
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const fetchContacts = useCallback(async (q: string) => {
    const res = await fetch(`/api/contacts?search=${encodeURIComponent(q)}&limit=20`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    }
  }, []);

  useEffect(() => {
    if (showModal) fetchContacts(contactSearch);
  }, [contactSearch, showModal, fetchContacts]);

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function bookingsForDay(day: number) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter((b) => b.date.startsWith(key));
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function openNewBooking(day?: number) {
    const d = day
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : new Date().toISOString().split("T")[0];
    setForm({ contactId: "", title: "Meeting", date: d, time: "10:00", duration: 30, notes: "" });
    setSelectedContact(null);
    setContactSearch("");
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.contactId || !form.date || !form.time) { setError("Contact and date/time are required"); return; }
    setSaving(true);
    setError("");
    const dateTime = new Date(`${form.date}T${form.time}:00`).toISOString();
    const res = await fetch("/api/bookings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: form.contactId, title: form.title, date: dateTime, duration: form.duration, notes: form.notes || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    setShowModal(false);
    fetchBookings();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  async function deleteBooking(id: string) {
    setDeletingId(id);
    await fetch(`/api/bookings/${id}`, { method: "DELETE", credentials: "include" });
    setBookings(prev => prev.filter(b => b.id !== id));
    setDeletingId(null);
  }

  const selectedDayBookings = selectedDate
    ? bookings.filter(b => b.date.startsWith(selectedDate))
    : bookings;

  const todayStr = today.toISOString().split("T")[0];
  const upcomingToday = bookings.filter(b => b.date.startsWith(todayStr) && b.status === "scheduled");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 flex-shrink-0">
        <h1 className="text-[15px] font-semibold text-gray-800">Bookings & Schedule</h1>
        <button
          onClick={() => openNewBooking()}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
        >
          <Plus size={13} /> New Booking
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar */}
        <div className="flex flex-col w-[340px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-gray-100"><ChevronLeft size={16} /></button>
            <span className="text-sm font-bold text-gray-800">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-gray-100"><ChevronRight size={16} /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 px-2 pb-3 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayBookings = bookingsForDay(day);
              const isToday = dayKey === todayStr;
              const isSelected = dayKey === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : dayKey)}
                  className={`relative flex flex-col items-center rounded-lg py-1.5 text-xs font-semibold transition
                    ${isSelected ? "bg-green-600 text-white" : isToday ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  {day}
                  {dayBookings.length > 0 && (
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : "bg-green-500"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Today's upcoming */}
          {upcomingToday.length > 0 && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-3">
              <p className="text-[11px] font-bold text-gray-400 mb-2">TODAY</p>
              {upcomingToday.map(b => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg bg-green-50 px-2.5 py-2 mb-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{b.title}</p>
                    <p className="text-[10px] text-gray-500">{formatTime(b.date)} · {b.contact.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings list */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-700">
              {selectedDate ? formatDate(selectedDate + "T00:00:00") : "All Bookings"} 
              <span className="ml-2 text-xs font-normal text-gray-400">({selectedDayBookings.length})</span>
            </p>
            {selectedDate && (
              <div className="flex items-center gap-2">
                <button onClick={() => openNewBooking(parseInt(selectedDate.split("-")[2]))}
                  className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100">
                  <Plus size={11} /> Book this day
                </button>
                <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading...
            </div>
          ) : selectedDayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Calendar size={32} className="text-gray-200" />
              <p className="text-sm">No bookings {selectedDate ? "on this day" : "yet"}</p>
              <button onClick={() => openNewBooking()} className="text-xs text-green-600 hover:underline">Create first booking</button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayBookings.map(b => {
                const st = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.scheduled;
                return (
                  <div key={b.id} className="flex items-start gap-4 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3">
                    {/* Time column */}
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-sm font-bold text-gray-800">{formatTime(b.date)}</p>
                      <p className="text-[10px] text-gray-400">{b.duration}min</p>
                    </div>

                    {/* Divider */}
                    <div className="flex-shrink-0 flex flex-col items-center pt-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="w-px flex-1 bg-gray-100 mt-1" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{b.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User size={11} className="text-gray-400" />
                            <p className="text-xs text-gray-500">{b.contact.name} · {b.contact.phone}</p>
                          </div>
                          {!selectedDate && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(b.date)}</p>
                          )}
                          {b.notes && <p className="text-xs text-gray-400 mt-1 italic">{b.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {b.status === "scheduled" && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <button onClick={() => updateStatus(b.id, "completed")}
                            className="rounded-lg bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100">
                            ✓ Complete
                          </button>
                          <button onClick={() => updateStatus(b.id, "no_show")}
                            className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100">
                            No Show
                          </button>
                          <button onClick={() => updateStatus(b.id, "cancelled")}
                            className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-100">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button onClick={() => deleteBooking(b.id)} disabled={deletingId === b.id}
                      className="flex-shrink-0 text-gray-200 hover:text-red-400 transition disabled:opacity-40">
                      {deletingId === b.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">New Booking</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

              {/* Contact */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Contact *</label>
                {selectedContact ? (
                  <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{selectedContact.name}</p>
                      <p className="text-[11px] text-gray-500">{selectedContact.phone}</p>
                    </div>
                    <button onClick={() => { setSelectedContact(null); setForm(f => ({ ...f, contactId: "" })); }}
                      className="text-gray-400 hover:text-red-500"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                      placeholder="Search contact..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                    {contacts.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-36 overflow-y-auto">
                        {contacts.map(c => (
                          <button key={c.id} onClick={() => { setSelectedContact(c); setForm(f => ({ ...f, contactId: c.id })); setContactSearch(""); }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50">
                            <p className="text-xs font-medium text-gray-800">{c.name}</p>
                            <p className="text-[11px] text-gray-400">{c.phone}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Demo Call, Follow-up"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Time *</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Duration</label>
                <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500">
                  {[15, 30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any notes about this meeting..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-green-500 resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? "Saving..." : "Book Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
