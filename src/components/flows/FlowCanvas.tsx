"use client";

import React, { useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  TriggerNode, ConditionNode, ActionNode, MessageNode,
  AIReplyNode, WaitNode, TemplateNode, AssignNode, TagNode, EndNode, ButtonRouterNode,
} from "./nodes";
import FlowSidebar from "./FlowSidebar";
import FlowTopbar from "./FlowTopbar";
import PropertiesPanel from "./PropertiesPanel";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Plus } from "lucide-react";

interface FlowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  flowName?: string;
  flowStatus?: "active" | "draft";
  onSave?: (name: string, nodes: Node[], edges: Edge[], closeAfter?: boolean, status?: "active" | "draft") => void;
  onClose?: () => void;
}

const NODE_TYPES: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  message: MessageNode,
  aiReply: AIReplyNode,
  wait: WaitNode,
  template: TemplateNode,
  assign: AssignNode,
  tag: TagNode,
  end: EndNode,
  buttonRouter: ButtonRouterNode,
};

function FlowInner({ initialNodes, initialEdges, flowName = "New Flow", flowStatus = "draft", onSave, onClose }: FlowCanvasProps) {
  const [name, setName] = useState(flowName);
  const [isActive, setIsActive] = useState(flowStatus === "active");
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges ?? []);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [zoom, setZoom] = useState(100);

  // Store only the selected node ID — derive live node from nodes array
  // This fixes the stale closure bug where typing in PropertiesPanel
  // would not update because selectedNode held an old snapshot
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const history = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const future  = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);

  const { zoomIn, zoomOut, fitView, getZoom } = useReactFlow();

  const pushHistory = useCallback((n: Node[], e: Edge[]) => {
    history.current.push({ nodes: n, edges: e });
    future.current = [];
  }, []);

  const undo = () => {
    if (history.current.length === 0) return;
    const prev = history.current.pop()!;
    future.current.push({ nodes, edges });
    setNodes(prev.nodes);
    setEdges(prev.edges);
  };

  const redo = () => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    history.current.push({ nodes, edges });
    setNodes(next.nodes);
    setEdges(next.edges);
  };

  const handleZoomIn  = () => { zoomIn({ duration: 200 });  setTimeout(() => setZoom(Math.round(getZoom() * 100)), 220); };
  const handleZoomOut = () => { zoomOut({ duration: 200 }); setTimeout(() => setZoom(Math.round(getZoom() * 100)), 220); };
  const handleFitView = () => { fitView({ duration: 300, padding: 0.1 }); setTimeout(() => setZoom(Math.round(getZoom() * 100)), 320); };

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const onConnect = useCallback(
    (connection: Connection) => {
      pushHistory(nodesRef.current, edges);
      setEdges((eds) => {
        const newEdges = addEdge(connection, eds);
        // Use nodesRef.current to avoid stale closure
        onSave?.(name, nodesRef.current, newEdges, false, isActive ? "active" : "draft");
        setLastSaved(new Date());
        return newEdges;
      });
    },
    [edges, pushHistory, setEdges, onSave, name, isActive]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const addNode = (type: string) => {
    pushHistory(nodes, edges);
    const newNode: Node = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `node-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
      type,
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: type.charAt(0).toUpperCase() + type.slice(1) },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const updateNodeData = (nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)
    );
  };

  const deleteNode = (nodeId: string) => {
    pushHistory(nodes, edges);
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  };

  const getLastSavedText = () => {
    if (!lastSaved) return "Not saved yet";
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 60) return `Last updated ${diff}s ago`;
    if (diff < 3600) return `Last updated ${Math.floor(diff / 60)}m ago`;
    return `Last updated ${lastSaved.toLocaleTimeString()}`;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      <FlowTopbar
        name={name}
        onNameChange={setName}
        onSave={() => { onSave?.(name, nodes, edges, true, isActive ? "active" : "draft"); setLastSaved(new Date()); }}
        onClose={onClose}
        isActive={isActive}
        onToggleActive={() => setIsActive((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <FlowSidebar onAddNode={addNode} />

        <div className="flex-1 relative flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          {/* Canvas toolbar */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm font-semibold text-gray-800">{name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  {isActive ? "Active" : "Draft"}
                </span>
              </div>
              <span className="text-xs text-gray-400">{getLastSavedText()}</span>
            </div>

            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={history.current.length === 0} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo">
                <Undo2 size={15} />
              </button>
              <button onClick={redo} disabled={future.current.length === 0} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo">
                <Redo2 size={15} />
              </button>
              <div className="flex items-center gap-1 mx-2 px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-600">
                <button onClick={handleZoomOut} className="hover:text-gray-800 p-0.5" title="Zoom out"><ZoomOut size={13} /></button>
                <span className="w-10 text-center font-medium">{zoom}%</span>
                <button onClick={handleZoomIn} className="hover:text-gray-800 p-0.5" title="Zoom in"><ZoomIn size={13} /></button>
              </div>
              <button onClick={handleFitView} className="p-1.5 hover:bg-gray-100 rounded text-gray-400" title="Fit view">
                <Maximize2 size={15} />
              </button>
              <button onClick={() => addNode("trigger")} className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700">
                <Plus size={13} /> Add Node
              </button>
            </div>
          </div>

          {/* React Flow canvas */}
          <div className="flex-1 relative" style={{ height: "100%", width: "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={() => setSelectedNodeId(null)}
              onMoveEnd={() => setZoom(Math.round(getZoom() * 100))}
              nodeTypes={NODE_TYPES}
              fitView
            >
              <Background variant={BackgroundVariant.Dots} color="#6366f1" gap={24} size={2} style={{ backgroundColor: "#ffffff" }} />
              <MiniMap className="!bottom-4 !right-4" nodeColor="#e5e7eb" maskColor="rgba(255,255,255,0.7)" />
            </ReactFlow>
          </div>
        </div>

        {selectedNode && (
          <PropertiesPanel
            node={selectedNode}
            allNodes={nodes}
            allEdges={edges}
            onUpdate={(data) => updateNodeData(selectedNode.id, data)}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
