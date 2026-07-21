"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Edit2, Trash2, MoreVertical, Zap, GitBranch, Sparkles, Send, Users, Webhook, Clock, Mail, Tag, CheckCircle2 } from "lucide-react";
import FlowCanvasBuilder from "@/components/flows/FlowCanvas";
import { Node, Edge } from "reactflow";

interface Flow {
  id: string;
  name: string;
  status: "active" | "draft";
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
}

const FLOW_ICONS = [
  { icon: Zap,          bg: "bg-blue-100",   color: "text-blue-600"   },
  { icon: Sparkles,     bg: "bg-purple-100", color: "text-purple-600" },
  { icon: Send,         bg: "bg-green-100",  color: "text-green-600"  },
  { icon: GitBranch,    bg: "bg-yellow-100", color: "text-yellow-600" },
  { icon: Users,        bg: "bg-cyan-100",   color: "text-cyan-600"   },
  { icon: Webhook,      bg: "bg-orange-100", color: "text-orange-600" },
  { icon: Clock,        bg: "bg-pink-100",   color: "text-pink-600"   },
  { icon: Mail,         bg: "bg-indigo-100", color: "text-indigo-600" },
  { icon: Tag,          bg: "bg-teal-100",   color: "text-teal-600"   },
  { icon: CheckCircle2, bg: "bg-gray-100",   color: "text-gray-600"   },
];

function getFlowIcon(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xff;
  return FLOW_ICONS[hash % FLOW_ICONS.length];
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Draft">("All");
  const [canvas, setCanvas] = useState<{ open: boolean; flow: Flow | null }>({ open: false, flow: null });

  const authHeaders = () => ({
    "Content-Type": "application/json",
  });

  const fetchFlows = async () => {
    try {
      const res = await fetch("/api/flows", { headers: authHeaders(), credentials: "include" });
      if (res.ok) setFlows(await res.json());
    } catch (error) {
      console.error("Error fetching flows:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFlows(); }, []);

  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;

  const saveFlow = async (
    name: string,
    nodes: Node[],
    edges: Edge[],
    closeAfter = true,
    status?: "active" | "draft"
  ) => {
    try {
      const currentFlow = canvasRef.current.flow;
      const isEdit = !!currentFlow?.id;
      const url = isEdit ? `/api/flows/${currentFlow!.id}` : "/api/flows";
      const method = isEdit ? "PATCH" : "POST";

      let cleanNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      }));
      const nodeIds = cleanNodes.map((n) => n.id);
      const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
      if (duplicateNodeIds.length > 0) {
        const uniqueDuplicates = [...new Set(duplicateNodeIds)].join(", ");
        console.warn("Duplicate node IDs found; removing duplicate nodes before save:", uniqueDuplicates);
        const seen = new Set<string>();
        cleanNodes = cleanNodes.filter((node) => {
          if (seen.has(node.id)) return false;
          seen.add(node.id);
          return true;
        });
      }

      const cleanEdges = edges.map((e) => ({
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
      }));

      const statusPayload = status ?? (isEdit ? currentFlow?.status ?? "draft" : "draft");
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ name, nodes: cleanNodes, edges: cleanEdges, status: statusPayload }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEdit) {
          setFlows((prev) => prev.map((f) => f.id === saved.id ? saved : f));
        } else {
          setFlows((prev) => [saved, ...prev]);
        }
        setCanvas((prev) => ({ ...prev, flow: saved }));
        if (closeAfter) setCanvas({ open: false, flow: null });
      } else {
        const errText = await res.text();
        console.error("Save failed:", res.status, res.statusText, errText);
      }
    } catch (error) {
      console.error("Error saving flow:", error);
    }
  };

  const toggleStatus = async (flow: Flow) => {
    const status = flow.status === "active" ? "draft" : "active";
    try {
      await fetch(`/api/flows/${flow.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      setFlows((prev) => prev.map((f) => (f.id === flow.id ? { ...f, status } : f)));
    } catch (error) {
      console.error("Error updating flow status:", error);
    }
  };

  const deleteFlow = async (id: string) => {
    try {
      await fetch(`/api/flows/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders() });
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting flow:", error);
    }
  };

  const filtered = flows.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || (filter === "Active" ? f.status === "active" : f.status !== "active");
    return matchSearch && matchFilter;
  });

  if (canvas.open) {
    return (
      <FlowCanvasBuilder
        initialNodes={canvas.flow?.nodes || []}
        initialEdges={canvas.flow?.edges || []}
        flowName={canvas.flow?.name || "New Flow"}
        flowStatus={canvas.flow?.status ?? "draft"}
        onSave={saveFlow}
        onClose={() => setCanvas({ open: false, flow: null })}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-[15px] font-semibold text-gray-800">Flows</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flows..."
              className="w-40 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>
          <button
            onClick={() => setCanvas({ open: true, flow: null })}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          >
            <Plus size={14} /> New Flow
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total Flows", value: flows.length,                                        bg: "bg-blue-50",   color: "text-blue-600",   Icon: Zap          },
            { label: "Active",      value: flows.filter((f) => f.status === "active").length,   bg: "bg-green-50",  color: "text-green-600",  Icon: CheckCircle2 },
            { label: "Draft",       value: flows.filter((f) => f.status !== "active").length,   bg: "bg-yellow-50", color: "text-yellow-600", Icon: Clock        },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                <s.Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-1 border-b border-gray-100 px-5 py-3">
            {(["All", "Active", "Draft"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filter === t ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">Loading flows...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-400">
              <div className="mb-4 flex gap-2">
                {[Zap, GitBranch, Sparkles, Send].map((Icon, i) => (
                  <div key={i} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FLOW_ICONS[i].bg} opacity-60`}>
                    <Icon size={18} className={FLOW_ICONS[i].color} />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium">No flows yet</p>
              <p className="text-xs mt-1">Click &quot;New Flow&quot; to build your first automation</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Flow Name</th>
                  <th className="px-3 py-3 text-left font-medium">Nodes</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-3 py-3 text-left font-medium">Created</th>
                  <th className="px-3 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const ic = getFlowIcon(f.id);
                  return (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${ic.bg}`}>
                            <ic.icon size={15} className={ic.color} />
                          </div>
                          <span className="font-medium text-gray-800">{f.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {f.nodes.length > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                            {f.nodes.length} nodes
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleStatus(f)} className="flex items-center gap-1.5">
                          <div className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${f.status === "active" ? "bg-green-500" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${f.status === "active" ? "translate-x-4" : "translate-x-0.5"}`} />
                          </div>
                          <span className={`text-xs font-medium ${f.status === "active" ? "text-green-600" : "text-gray-400"}`}>
                            {f.status === "active" ? "Active" : "Draft"}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2 text-gray-400">
                          <button onClick={() => setCanvas({ open: true, flow: f })} className="p-2 hover:bg-blue-50 rounded hover:text-blue-600">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteFlow(f.id)} className="p-2 hover:bg-red-50 rounded hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                          <button className="p-2 hover:bg-gray-100 rounded">
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
