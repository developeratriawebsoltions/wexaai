"use client";

import React, { useEffect, useState } from "react";
import { Node, Edge } from "reactflow";
import { X, Trash2, GitBranch, Zap, Send, Sparkles, Clock, Mail, Users, Tag, CheckCircle2 } from "lucide-react";

interface PropertiesPanelProps {
  node: Node;
  allNodes?: Node[];
  allEdges?: Edge[];
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
}

const NODE_META: Record<string, { label: string; desc: string; icon: React.ElementType; bg: string; color: string }> = {
  trigger:      { label: "Trigger",        desc: "Start the flow",                          icon: Zap,          bg: "bg-green-100",  color: "text-green-600"  },
  condition:    { label: "Condition",      desc: "Check if the message matches",            icon: GitBranch,    bg: "bg-purple-100", color: "text-purple-600" },
  message:      { label: "Send Message",   desc: "Send a text message",                     icon: Send,         bg: "bg-orange-100", color: "text-orange-600" },
  aiReply:      { label: "AI Reply",       desc: "Generate AI-powered reply",               icon: Sparkles,     bg: "bg-purple-100", color: "text-purple-600" },
  wait:         { label: "Wait",           desc: "Pause execution for a duration",          icon: Clock,        bg: "bg-yellow-100", color: "text-yellow-600" },
  template:     { label: "Template",       desc: "Send a pre-built template",               icon: Mail,         bg: "bg-green-100",  color: "text-green-600"  },
  assign:       { label: "Assign Agent",   desc: "Assign to a team member",                 icon: Users,        bg: "bg-cyan-100",   color: "text-cyan-600"   },
  tag:          { label: "Add Tag",        desc: "Add a tag to contact",                    icon: Tag,          bg: "bg-teal-100",   color: "text-teal-600"   },
  end:          { label: "End",            desc: "End the flow",                            icon: CheckCircle2, bg: "bg-gray-100",   color: "text-gray-600"   },
  buttonRouter: { label: "Button Router",  desc: "Route by template button reply",          icon: GitBranch,    bg: "bg-indigo-100", color: "text-indigo-600" },
};

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelCls = "block text-[10px] font-bold tracking-widest text-gray-500 mb-1.5 uppercase";

interface TemplateButton {
  type: string;
  text: string;
}

interface TemplateOption {
  id: string;
  name: string;
  language: string;
  body: string;
  status: string;
  headerType?: string | null;
  header?: string | null;
  buttons?: TemplateButton[] | null;
}

function useApprovedTemplates() {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/templates", { credentials: "include" })
      .then((r) => r.json())
      .then((data: TemplateOption[]) => setTemplates(data.filter((t) => t.status === "APPROVED")))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);
  return { templates, loading };
}

function TemplateConfig({ node, onUpdate }: { node: Node; onUpdate: (d: Record<string, unknown>) => void }) {
  const { templates, loading } = useApprovedTemplates();
  const selected = templates.find((t) => t.id === node.data.templateId);
  const quickReplies = selected?.buttons?.filter((b) => b.type === "QUICK_REPLY") ?? [];
  const isImageTemplate = selected?.headerType === "IMAGE";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Node Name</label>
        <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Select Template</label>
        {loading ? (
          <p className="text-xs text-gray-400">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-red-400">No approved templates found</p>
        ) : (
          <select
            className={inputCls}
            value={node.data.templateId || ""}
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              const qr = t?.buttons?.filter((b) => b.type === "QUICK_REPLY") ?? [];
              onUpdate({
                templateId: e.target.value,
                templateName: t?.name ?? "",
                templateLanguage: t?.language ?? "en",
                templateHeaderType: t?.headerType ?? null,
                templateButtons: qr.map((b) => b.text),
                // clear headerImageUrl when switching templates
                headerImageUrl: "",
              });
            }}
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.language}){t.headerType === "IMAGE" ? " 🖼️" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Image header URL — only shown when selected template has IMAGE header */}
      {isImageTemplate && (
        <div>
          <label className={labelCls}>Header Image URL</label>
          <input
            className={inputCls}
            placeholder="https://example.com/image.jpg"
            value={(node.data.headerImageUrl as string) || ""}
            onChange={(e) => onUpdate({ headerImageUrl: e.target.value })}
          />
          {/* Live preview */}
          {(node.data.headerImageUrl as string) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.data.headerImageUrl as string}
              alt="header preview"
              className="mt-2 w-full h-28 object-cover rounded-lg border border-gray-200"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              onLoad={(e) => { (e.target as HTMLImageElement).style.display = "block"; }}
            />
          )}
          <p className="text-[11px] text-gray-400 mt-1">Must be a permanent public URL (HTTPS)</p>
        </div>
      )}

      {selected && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase">Preview</p>
          {selected.headerType === "TEXT" && selected.header && (
            <p className="text-[11px] font-bold text-gray-700">{selected.header}</p>
          )}
          <p className="text-xs text-gray-600 leading-snug">{selected.body}</p>
          {quickReplies.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {quickReplies.map((b) => (
                <span key={b.text} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {b.text}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <label className={labelCls}>Typing Delay (seconds)</label>
        <input
          type="number" min="0" max="10" className={inputCls} placeholder="2"
          value={node.data.typingDelay || ""}
          onChange={(e) => onUpdate({ typingDelay: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">Show typing indicator before sending</p>
      </div>
    </div>
  );
}

// ButtonRouter config — select which template's buttons to route on
function ButtonRouterConfig({ node, onUpdate }: { node: Node; onUpdate: (d: Record<string, unknown>) => void }) {
  const { templates, loading } = useApprovedTemplates();
  const selected = templates.find((t) => t.id === node.data.templateId);
  const quickReplies = selected?.buttons?.filter((b) => b.type === "QUICK_REPLY") ?? [];

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Node Name</label>
        <input className={inputCls} value={node.data.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Template (whose buttons to route)</label>
        {loading ? (
          <p className="text-xs text-gray-400">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-xs text-red-400">No approved templates found</p>
        ) : (
          <select
            className={inputCls}
            value={node.data.templateId || ""}
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              const qr = t?.buttons?.filter((b) => b.type === "QUICK_REPLY") ?? [];
              onUpdate({
                templateId: e.target.value,
                templateName: t?.name ?? "",
                // templateButtons drives the dynamic handles on the canvas node
                templateButtons: qr.map((b) => b.text),
              });
            }}
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.language})</option>
            ))}
          </select>
        )}
      </div>
      {quickReplies.length > 0 && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Button outputs</p>
          {quickReplies.map((b, i) => (
            <div key={b.text} className="flex items-center gap-2">
              <span className="text-[10px] w-4 text-indigo-400 font-bold">{i + 1}</span>
              <span className="text-xs text-indigo-700 font-medium">{b.text}</span>
              <span className="ml-auto text-[9px] text-indigo-400">→ connect node</span>
            </div>
          ))}
          <p className="text-[10px] text-indigo-400 mt-1">Each button has its own output handle on the right side of the node.</p>
        </div>
      )}
      {!selected && (
        <p className="text-xs text-gray-400">Select a template to see its buttons as output handles.</p>
      )}
    </div>
  );
}

export default function PropertiesPanel({ node, allNodes = [], allEdges = [], onUpdate, onDelete, onClose }: PropertiesPanelProps) {
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
                <option value="button_reply">Template Button Reply</option>
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

      case "condition": {
        const incomingEdge = allEdges.find((e) => e.target === node.id);
        const parentNode = incomingEdge ? allNodes.find((n) => n.id === incomingEdge.source) : null;
        const parentButtons: string[] =
          parentNode?.type === "template" && Array.isArray(parentNode.data.templateButtons)
            ? (parentNode.data.templateButtons as string[])
            : [];
        const isButtonReply = (node.data.conditionType || "contains") === "button_reply";

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
                <option value="button_reply">Button reply is</option>
                <option value="tag">Contact has tag</option>
                <option value="language">Language equals</option>
              </select>
            </div>
            {isButtonReply && parentButtons.length > 0 ? (
              <div>
                <label className={labelCls}>Button</label>
                <select className={inputCls} value={node.data.value || ""} onChange={(e) => onUpdate({ value: e.target.value })}>
                  <option value="">Select button...</option>
                  {parentButtons.map((btn) => (
                    <option key={btn} value={btn}>{btn}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Buttons from connected template</p>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Value</label>
                <input
                  className={inputCls}
                  placeholder={isButtonReply ? "Yes, Not interested" : "hi, hello"}
                  value={node.data.value || ""}
                  onChange={(e) => onUpdate({ value: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {isButtonReply ? "Connect a Template node above, or type button text manually" : "Enter words separated by comma"}
                </p>
              </div>
            )}
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
          </div>
        );
      }

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
            <div>
              <label className={labelCls}>Typing Delay (seconds)</label>
              <input type="number" min="0" max="10" className={inputCls} placeholder="2" value={node.data.typingDelay || ""} onChange={(e) => onUpdate({ typingDelay: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1">Show typing indicator before sending</p>
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

      case "template":
        return <TemplateConfig node={node} onUpdate={onUpdate} />;

      case "buttonRouter":
        return <ButtonRouterConfig node={node} onUpdate={onUpdate} />;

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

      <div className="flex-1 overflow-y-auto p-4">{renderConfig()}</div>

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
