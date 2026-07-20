"use client";

import React from "react";
import {
  Zap, GitBranch, Send, Sparkles, Clock, Mail, Users, Tag,
  CheckCircle2, Webhook, HelpCircle, UserPlus, Globe,
} from "lucide-react";

interface SidebarNode {
  id: string;
  label: string;
  icon: React.ElementType;
  bg: string;
  color: string;
}

const SECTIONS: { label: string; color: string; nodes: SidebarNode[] }[] = [
  {
    label: "TRIGGERS",
    color: "text-blue-500",
    nodes: [
      { id: "trigger", label: "Customer Message", icon: Zap,         bg: "bg-blue-100",   color: "text-blue-600"   },
      { id: "trigger", label: "New Contact",       icon: UserPlus,    bg: "bg-blue-100",   color: "text-blue-600"   },
      { id: "trigger", label: "Template Status",   icon: Mail,        bg: "bg-green-100",  color: "text-green-600"  },
      { id: "trigger", label: "Webhook",           icon: Webhook,     bg: "bg-orange-100", color: "text-orange-600" },
    ],
  },
  {
    label: "ACTIONS",
    color: "text-purple-500",
    nodes: [
      { id: "message",  label: "Send Message",  icon: Send,       bg: "bg-orange-100", color: "text-orange-600" },
      { id: "template", label: "Send Template", icon: Mail,       bg: "bg-green-100",  color: "text-green-600"  },
      { id: "aiReply",  label: "AI Reply",       icon: Sparkles,   bg: "bg-purple-100", color: "text-purple-600" },
      { id: "action",   label: "Ask Question",  icon: HelpCircle, bg: "bg-pink-100",   color: "text-pink-600"   },
      { id: "tag",      label: "Add Tag",        icon: Tag,        bg: "bg-green-100",  color: "text-green-600"  },
      { id: "assign",   label: "Update Contact", icon: Users,      bg: "bg-blue-100",   color: "text-blue-600"   },
      { id: "assign",   label: "Assign Agent",   icon: Users,      bg: "bg-cyan-100",   color: "text-cyan-600"   },
      { id: "trigger",  label: "Webhook",        icon: Globe,      bg: "bg-orange-100", color: "text-orange-600" },
      { id: "wait",     label: "Wait",           icon: Clock,      bg: "bg-yellow-100", color: "text-yellow-600" },
    ],
  },
  {
    label: "LOGIC",
    color: "text-yellow-500",
    nodes: [
      { id: "condition", label: "Condition", icon: GitBranch, bg: "bg-purple-100", color: "text-purple-600" },
    ],
  },
  {
    label: "END",
    color: "text-gray-400",
    nodes: [
      { id: "end", label: "End", icon: CheckCircle2, bg: "bg-gray-100", color: "text-gray-500" },
    ],
  },
];

const MIN_W = 180;
const MAX_W = 400;
const DEFAULT_W = 224;

// scale a value linearly between min/max based on width
function scale(width: number, min: number, max: number): number {
  const t = (width - MIN_W) / (MAX_W - MIN_W);
  return Math.round(min + t * (max - min));
}

interface FlowSidebarProps {
  onAddNode: (type: string) => void;
}

export default function FlowSidebar({ onAddNode }: FlowSidebarProps) {
  const [width, setWidth] = React.useState(DEFAULT_W);
  const dragging = React.useRef(false);
  const startX = React.useRef(0);
  const startW = React.useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newW = Math.min(MAX_W, Math.max(MIN_W, startW.current + (e.clientX - startX.current)));
      setWidth(newW);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  // derived sizes based on width
  const iconBox  = scale(width, 24, 44);   // icon container px
  const iconSize = scale(width, 12, 22);   // lucide icon size
  const fontSize = scale(width, 10, 15);   // node label font size px
  const labelSize = scale(width, 9, 12);   // section label font size px
  const gap      = scale(width, 6, 14);    // gap between icon and text px
  const px       = scale(width, 6, 16);    // horizontal padding px
  const py       = scale(width, 6, 12);    // vertical padding px

  return (
    <div style={{ width }} className="relative bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-0 h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h3 style={{ fontSize: fontSize + 2 }} className="font-semibold text-gray-800">Add Nodes</h3>
        <p style={{ fontSize: fontSize - 1 }} className="text-gray-400 mt-0.5 leading-tight">
          Drag and drop nodes to build your flow
        </p>
      </div>

      {/* Nodes list */}
      <div className="flex-1 overflow-y-auto pb-3" style={{ paddingLeft: px / 2, paddingRight: px / 2 }}>
        {SECTIONS.map((section) => (
          <div key={section.label} className="mt-3">
            <p
              style={{ fontSize: labelSize, paddingLeft: px / 2 }}
              className={`font-bold tracking-widest mb-2 uppercase ${section.color}`}
            >
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.nodes.map((node, idx) => (
                <div
                  key={`${section.label}-${idx}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("application/reactflow", node.id);
                  }}
                  onClick={() => onAddNode(node.id)}
                  style={{ gap, paddingLeft: px / 2, paddingRight: px / 2, paddingTop: py / 2, paddingBottom: py / 2 }}
                  className="flex items-center rounded-lg hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div
                    style={{ width: iconBox, height: iconBox, minWidth: iconBox }}
                    className={`flex items-center justify-center rounded-lg ${node.bg}`}
                  >
                    <node.icon size={iconSize} className={node.color} />
                  </div>
                  <span
                    style={{ fontSize }}
                    className="font-medium text-gray-700 leading-tight truncate"
                  >
                    {node.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group z-10"
      >
        <div className="w-full h-full group-hover:bg-blue-400 transition-colors" />
      </div>
    </div>
  );
}
