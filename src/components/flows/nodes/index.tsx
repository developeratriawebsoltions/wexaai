import React from "react";
import { Handle, Position } from "reactflow";
import {
  Zap, GitBranch, Send, Sparkles, Clock, Mail, Users, Tag,
  CheckCircle2, MessageSquare, HelpCircle, Globe, UserPlus,
} from "lucide-react";

interface CustomNodeProps {
  data: Record<string, string>;
  selected: boolean;
}

// ── shared card shell ──────────────────────────────────────────────────────────
const Card: React.FC<{
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  info?: string;
  selected: boolean;
  hasTarget?: boolean;
  hasSource?: boolean;
  extraHandles?: React.ReactNode;
}> = ({
  icon: Icon, iconBg, iconColor, borderColor,
  title, subtitle, badge, badgeColor, info,
  selected, hasTarget = true, hasSource = true, extraHandles,
}) => (
  <div
    className={`relative min-w-[210px] max-w-[240px] rounded-xl border-2 bg-white shadow-sm transition-shadow
      ${borderColor} ${selected ? "shadow-lg ring-2 ring-blue-400 ring-offset-1" : "hover:shadow-md"}`}
  >
    {hasTarget && <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />}

    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={15} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-gray-800 truncate">{title}</p>
          {badge && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 truncate leading-tight">{subtitle}</p>
      </div>
    </div>

    {info && (
      <div className="mx-3 mb-3 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
        <p className="text-[11px] text-gray-600 leading-snug">{info}</p>
      </div>
    )}

    {extraHandles}
    {hasSource && <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />}
  </div>
);

// ── TRIGGER ───────────────────────────────────────────────────────────────────
export const TriggerNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const eventMap: Record<string, string> = {
    message: "Customer Sends Message",
    contact: "New Contact Added",
    template: "Template Delivered",
    button_reply: "Template Button Reply",
  };
  const event = eventMap[data.event] || "Customer Sends Message";
  const info = data.keyword ? `Keyword: "${data.keyword}"` : "When customer sends a message";

  return (
    <Card
      icon={Zap} iconBg="bg-green-100" iconColor="text-green-600"
      borderColor="border-green-300"
      title="Trigger" subtitle={event}
      badge="START" badgeColor="bg-green-100 text-green-700"
      info={info}
      selected={selected} hasTarget={false}
    />
  );
};

// ── CONDITION ─────────────────────────────────────────────────────────────────
export const ConditionNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const typeMap: Record<string, string> = {
    contains: "Message contains",
    button_reply: "Button reply is",
    tag: "Contact has tag",
    language: "Language equals",
  };
  const condType = typeMap[data.conditionType] || "Message contains";
  const info = data.value ? `${condType}: "${data.value}"` : `${condType} ...`;

  return (
    <div
      className={`relative min-w-[210px] max-w-[240px] rounded-xl border-2 bg-white shadow-sm
        border-purple-300 ${selected ? "shadow-lg ring-2 ring-blue-400 ring-offset-1" : "hover:shadow-md"}`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />

      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
          <GitBranch size={15} className="text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800">Condition</p>
          <p className="text-[10px] text-gray-400 truncate">Check if the message matches</p>
        </div>
      </div>

      <div className="mx-3 mb-3 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
        <p className="text-[11px] text-gray-600">{info}</p>
      </div>

      <div className="flex justify-between px-6 pb-2 text-[10px] font-semibold">
        <span className="text-green-600">Yes</span>
        <span className="text-red-500">No</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} className="!w-3 !h-3 !bg-green-500 !border-2 !border-white" />
      <Handle type="source" position={Position.Bottom} id="no"  style={{ left: "70%" }} className="!w-3 !h-3 !bg-red-400 !border-2 !border-white" />
    </div>
  );
};

// ── ACTION (generic) ──────────────────────────────────────────────────────────
export const ActionNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={Send} iconBg="bg-orange-100" iconColor="text-orange-600"
    borderColor="border-orange-300"
    title="Action" subtitle={data.action || "Configure action"}
    info={data.label || "Perform an action in the flow"}
    selected={selected}
  />
);

// ── SEND MESSAGE ──────────────────────────────────────────────────────────────
export const MessageNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={MessageSquare} iconBg="bg-orange-100" iconColor="text-orange-600"
    borderColor="border-orange-300"
    title="Send Message" subtitle="WhatsApp text message"
    info={data.message ? `"${data.message.slice(0, 60)}${data.message.length > 60 ? "…" : ""}"` : "Click to write your message"}
    selected={selected}
  />
);

// ── AI REPLY ──────────────────────────────────────────────────────────────────
export const AIReplyNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={Sparkles} iconBg="bg-blue-100" iconColor="text-blue-600"
    borderColor="border-blue-300"
    title="AI Reply" subtitle={`Model: ${data.model || "GPT-4"}`}
    badge="AI" badgeColor="bg-blue-100 text-blue-700"
    info={data.prompt ? `Prompt: "${data.prompt.slice(0, 55)}…"` : "Generate AI reply using agent"}
    selected={selected}
  />
);

// ── WAIT ──────────────────────────────────────────────────────────────────────
export const WaitNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={Clock} iconBg="bg-yellow-100" iconColor="text-yellow-600"
    borderColor="border-yellow-300"
    title="Wait" subtitle="Pause before next step"
    info={data.duration ? `Wait for ${data.duration} ${data.unit || "minutes"}` : "Set wait duration"}
    selected={selected}
  />
);

// ── SEND TEMPLATE ─────────────────────────────────────────────────────────────
export const TemplateNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={Mail} iconBg="bg-green-100" iconColor="text-green-600"
    borderColor="border-green-300"
    title="Send Template" subtitle="WhatsApp approved template"
    info={data.templateName ? `Template: "${data.templateName}"` : "Select a template to send"}
    selected={selected}
  />
);

// ── ASSIGN AGENT ──────────────────────────────────────────────────────────────
export const AssignNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={Users} iconBg="bg-cyan-100" iconColor="text-cyan-600"
    borderColor="border-cyan-300"
    title="Assign Agent" subtitle="Route to team member"
    info={data.agent ? `Assign to: ${data.agent}` : "Select agent or team"}
    selected={selected}
  />
);

// ── ADD TAG ───────────────────────────────────────────────────────────────────
export const TagNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <Card
    icon={Tag} iconBg="bg-teal-100" iconColor="text-teal-600"
    borderColor="border-teal-300"
    title="Add Tag" subtitle="Label this contact"
    info={data.tag ? `Tag: "${data.tag}"` : "Enter tag name (e.g. lead, vip)"}
    selected={selected}
  />
);

// ── BUTTON ROUTER ─────────────────────────────────────────────────────────────
// Fixed height node — handles are absolutely positioned on the container
// so they never overlap regardless of button count (works for 2–10 buttons)
const HEADER_H = 56;  // header section px
const ROW_H    = 34;  // each button row px
const BOTTOM_P = 12;  // bottom padding px

export const ButtonRouterNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const buttons: string[] = Array.isArray(data.templateButtons)
    ? (data.templateButtons as unknown as string[])
    : [];

  const nodeH = HEADER_H + buttons.length * ROW_H + BOTTOM_P;

  return (
    <div
      className={`relative rounded-xl border-2 bg-white shadow-sm border-indigo-300
        ${selected ? "shadow-lg ring-2 ring-blue-400 ring-offset-1" : "hover:shadow-md"}`}
      style={{ width: 240, height: nodeH }}
    >
      {/* top target handle */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />

      {/* header */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
          <GitBranch size={15} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-800">Button Router</p>
          <p className="text-[10px] text-gray-400 truncate">
            {data.templateName ? `Template: ${data.templateName}` : "Route by button reply"}
          </p>
        </div>
      </div>

      {buttons.length > 0 ? (
        <div className="px-3 space-y-0.5">
          {buttons.map((btn, i) => {
            // center of this row relative to total node height → used for handle top
            const rowCenterPx = HEADER_H + i * ROW_H + ROW_H / 2;
            const topPct = (rowCenterPx / nodeH) * 100;

            return (
              <div
                key={`${btn}-${i}`}
                className="flex items-center rounded-lg bg-indigo-50 border border-indigo-100 px-2.5"
                style={{ height: ROW_H - 4 }}
              >
                <span className="text-[11px] text-indigo-700 font-medium truncate">{btn}</span>

                {/* handle is on the outer container, not inside this div */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`btn-${i}`}
                  style={{
                    position: "absolute",
                    right: -6,
                    top: `${topPct}%`,
                    transform: "translateY(-50%)",
                  }}
                  className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mx-3 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-2">
          <p className="text-[11px] text-gray-400">Select a template in properties</p>
        </div>
      )}
    </div>
  );
};

// ── END ───────────────────────────────────────────────────────────────────────
export const EndNode: React.FC<CustomNodeProps> = ({ data, selected }) => (
  <div
    className={`relative min-w-[210px] max-w-[240px] rounded-xl border-2 bg-white shadow-sm
      border-gray-300 ${selected ? "shadow-lg ring-2 ring-blue-400 ring-offset-1" : "hover:shadow-md"}`}
  >
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white" />
    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <CheckCircle2 size={15} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-gray-800">End</p>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">END</span>
        </div>
        <p className="text-[10px] text-gray-400 leading-tight">Flow completed</p>
      </div>
    </div>
    <div className="mx-3 mb-3 rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
      <p className="text-[11px] text-gray-500">{data.label || "This flow ends here"}</p>
    </div>
  </div>
);
