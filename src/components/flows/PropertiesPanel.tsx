"use client";

import React from "react";
import { Node } from "reactflow";
import { X, Trash2, GitBranch, Zap, Send, Sparkles, Clock, Mail, Users, Tag, CheckCircle2 } from "lucide-react";

interface PropertiesPanelProps {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const NODE_META: Record<string, { label: string; desc: string; icon: React.ElementType; bg: string; color: string }> = {
  trigger:   { label: "Trigger",    desc: "Start the flow",                  icon: Zap,          bg: "bg-green-100",  color: "text-green-600"  },
  condition: { label: "Condition",  desc: "Check if the message matches the condition", icon: GitBranch,    bg: "bg-purple-100", color: "text-purple-600" },
  message:   { label: "Send Message", desc: "Send a text message",           icon: Send,         bg: "bg-orange-100", color: "text-orange-600" },
  aiReply:   { label: "AI Reply",   desc: "Generate AI-powered reply",       icon: Sparkles,     bg: "bg-purple-100", color: "text-purple-600" },
  wait:      { label: "Wait",       desc: "Pause execution for a duration",  icon: Clock,        bg: "bg-yellow-100", color: "text-yellow-600" },
  template:  { label: "Template",   desc: "Send a pre-built template",       icon: Mail,         bg: "bg-green-100",  color: "text-green-600"  },
  assign:    { label: "Assign Agent", desc: "Assign to a team member",       icon: Users,        bg: "bg-cyan-100",   color: "text-cyan-600"   },
  tag:       { label: "Add Tag",    desc: "Add a tag to contact",            icon: Tag,          bg: "bg-teal-100",   color: "text-teal-600"   },
  end:       { label: "End",        desc: "End the flow",                    icon: CheckCircle2, bg: "bg-gray-100",   color: "text-gray-600"   },
};

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelCls = "block text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 uppercase";

export default function PropertiesPanel({ node, onUpdate, onDelete, onClose }: PropertiesPanelProps) {
  const meta = NODE_META[node.type || ""] || NODE_META["trigger"];
  const Icon = meta.icon;

  const renderConfig = () => {
    switch (node.type) {
      case "trigger":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Trigger Event</label>
              <select className={inputCls} value={node.data.event || "message"} onChange={(e) => onUpdate({ event: e.target.value })}>
                <option value="message">Customer Sends Message</option>
                <option value="contact">New Contact</option>
                <option value="template">Template Delivered</option>
              </select>
            </div>
            {node.data.event === "message" && (
              <div>
                <label className={labelCls}>Keyword (optional)</label>
                <input className={inputCls} placeholder="e.g., Hi, Help" value={node.data.keyword || ""} onChange={(e) => onUpdate({ keyword: e.target.value })} />
              </div>
            )}
          </div>
        );

      case "condition":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Condition Type</label>
              <select className={inputCls} value={node.data.conditionType || "contains"} onChange={(e) => onUpdate({ conditionType: e.target.value })}>
                <option value="contains">Message contains</option>
                <option value="tag">Contact has tag</option>
                <option value="language">Language equals</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Value</label>
              <input className={inputCls} placeholder="hi, hello" value={node.data.value || ""} onChange={(e) => onUpdate({ value: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">Enter words separated by comma</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Case Sensitive</span>
              <button
                onClick={() => onUpdate({ caseSensitive: !node.data.caseSensitive })}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${node.data.caseSensitive ? "bg-green-500" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${node.data.caseSensitive ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div>
              <label className={labelCls}>Match Type</label>
              <div className="space-y-2">
                {[{ v: "any", label: "Match any", sub: "Match if any of the words are found" }, { v: "all", label: "Match all", sub: "Match if all words are found" }].map((opt) => (
                  <label key={opt.v} className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" name="matchType" value={opt.v} checked={(node.data.matchType || "any") === opt.v} onChange={() => onUpdate({ matchType: opt.v })} className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-gray-600 py-2 border-t border-gray-100">
                <span>Advanced Settings</span>
                <span className="group-open:rotate-180 transition-transform">›</span>
              </summary>
            </details>
          </div>
        );

      case "message":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Message Text</label>
              <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Type your message..." value={node.data.message || ""} onChange={(e) => onUpdate({ message: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Message Type</label>
              <select className={inputCls} value={node.data.messageType || "text"} onChange={(e) => onUpdate({ messageType: e.target.value })}>
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="document">Document</option>
              </select>
            </div>
          </div>
        );

      case "aiReply":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>AI Prompt</label>
              <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Give instructions to AI..." value={node.data.prompt || ""} onChange={(e) => onUpdate({ prompt: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Model</label>
              <select className={inputCls} value={node.data.model || "gpt-4"} onChange={(e) => onUpdate({ model: e.target.value })}>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>
        );

      case "wait":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Duration</label>
              <div className="flex gap-2">
                <input type="number" min="1" className={`${inputCls} flex-1`} placeholder="5" value={node.data.duration || ""} onChange={(e) => onUpdate({ duration: e.target.value })} />
                <select className={inputCls} value={node.data.unit || "minutes"} onChange={(e) => onUpdate({ unit: e.target.value })}>
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "assign":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Assign To</label>
              <select className={inputCls} value={node.data.agent || ""} onChange={(e) => onUpdate({ agent: e.target.value })}>
                <option value="">Select agent...</option>
                <option value="agent1">John Doe</option>
                <option value="agent2">Jane Smith</option>
              </select>
            </div>
          </div>
        );

      case "tag":
        return (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Node Name</label>
              <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Tag Name</label>
              <input className={inputCls} placeholder="e.g., lead, vip" value={node.data.tag || ""} onChange={(e) => onUpdate({ tag: e.target.value })} />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label className={labelCls}>Node Name</label>
            <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.bg}`}>
            <Icon size={16} className={meta.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
            <p className="text-xs text-gray-400 leading-tight">{meta.desc}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400 mt-0.5">
          <X size={15} />
        </button>
      </div>

      {/* Config */}
      <div className="flex-1 overflow-y-auto p-4">{renderConfig()}</div>

      {/* Delete */}
      <div className="border-t border-gray-100 p-4">
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
        >
          <Trash2 size={14} />
          Delete Node
        </button>
      </div>
    </div>
  );
}
