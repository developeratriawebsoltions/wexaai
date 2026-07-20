"use client";

import React, { useRef, useEffect } from "react";
import {
  Save, Zap, ChevronRight, Pencil, MoreHorizontal, Bell,
  Copy, Trash2, Download, Settings, HelpCircle, CheckCheck,
  User, LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface FlowTopbarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onClose?: () => void;
  isActive?: boolean;
  onToggleActive?: () => void;
}

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

const NOTIFICATIONS = [
  { id: 1, text: "Flow \"Welcome Flow\" was published", time: "2m ago", read: false },
  { id: 2, text: "New contact triggered your flow", time: "15m ago", read: false },
  { id: 3, text: "Flow saved successfully", time: "1h ago", read: true },
];

export default function FlowTopbar({
  name,
  onNameChange,
  onSave,
  onClose,
  isActive = false,
  onToggleActive,
}: FlowTopbarProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const [notifs, setNotifs] = React.useState(NOTIFICATIONS);

  const { user, logout } = useAuth();

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useOutsideClick(menuRef, () => setShowMenu(false));
  useOutsideClick(notifRef, () => setShowNotifs(false));
  useOutsideClick(profileRef, () => setShowProfile(false));

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  return (
    <div className="flex items-center justify-between h-14 bg-white border-b border-gray-200 px-5 shrink-0">
      {/* Left — breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-medium">
          Flows
        </button>
        <ChevronRight size={14} className="text-gray-400" />
        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
            className="font-semibold text-gray-800 border-b border-blue-500 outline-none bg-transparent"
          />
        ) : (
          <span className="font-semibold text-gray-800">{name || "New Flow"}</span>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        {/* Active toggle */}
        <button
          onClick={onToggleActive}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          <span className={`w-3 h-3 rounded-full bg-white ${isActive ? "opacity-100" : "opacity-60"}`} />
          {isActive ? "Active" : "Inactive"}
        </button>

        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium"
        >
          <Save size={14} />
          Save
        </button>

        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm font-semibold">
          <Zap size={14} />
          Publish
        </button>

        {/* Three-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setShowMenu((v) => !v); setShowNotifs(false); }}
            className={`p-2 rounded-lg text-gray-400 hover:bg-gray-100 ${showMenu ? "bg-gray-100" : ""}`}
          >
            <MoreHorizontal size={18} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Copy size={14} className="text-gray-400" /> Duplicate Flow
              </button>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Download size={14} className="text-gray-400" /> Export JSON
              </button>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Settings size={14} className="text-gray-400" /> Flow Settings
              </button>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <HelpCircle size={14} className="text-gray-400" /> Help
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={14} /> Delete Flow
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bell / Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifs((v) => !v); setShowMenu(false); }}
            className={`relative p-2 rounded-lg text-gray-400 hover:bg-gray-100 ${showNotifs ? "bg-gray-100" : ""}`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No notifications</p>
                ) : (
                  notifs.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.read ? "bg-blue-50/40" : ""}`}
                      onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.read ? "bg-blue-500" : "bg-gray-200"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{n.text}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile avatar */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile((v) => !v); setShowMenu(false); setShowNotifs(false); }}
            className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-green-400 transition-all"
          >
            {initials}
          </button>

          {showProfile && (
            <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name ?? "User"}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email ?? ""}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User size={14} className="text-gray-400" /> My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={14} className="text-gray-400" /> Settings
                </Link>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => { setShowProfile(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
