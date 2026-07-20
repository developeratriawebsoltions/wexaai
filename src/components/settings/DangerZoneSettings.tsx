'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TriangleAlert, Trash2, Download, Unlink, Users } from 'lucide-react';

interface DangerZoneSettingsProps {
  workspaceId: string;
}

const ACTIONS = [
  {
    id: 'delete_workspace',
    icon: Trash2,
    label: 'Delete Workspace',
    desc: 'Permanently delete this workspace and all associated data.',
    color: 'red',
    btnLabel: 'Delete',
    destructive: true,
  },
  {
    id: 'export_data',
    icon: Download,
    label: 'Export Data',
    desc: 'Download all your workspace data in CSV format.',
    color: 'orange',
    btnLabel: 'Export',
    destructive: false,
  },
  {
    id: 'disconnect_whatsapp',
    icon: Unlink,
    label: 'Disconnect WhatsApp',
    desc: 'Unlink your WhatsApp Business Account. You can reconnect later.',
    color: 'yellow',
    btnLabel: 'Disconnect',
    destructive: false,
  },
  {
    id: 'delete_all_contacts',
    icon: Users,
    label: 'Delete All Contacts',
    desc: 'Permanently remove all contacts from your workspace.',
    color: 'red',
    btnLabel: 'Delete',
    destructive: true,
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; desc: string }> = {
  red:    { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-800',    desc: 'text-red-600' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-800', desc: 'text-orange-600' },
  yellow: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-800', desc: 'text-yellow-600' },
};

export default function DangerZoneSettings({ workspaceId }: DangerZoneSettingsProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleAction = async (id: string) => {
    const res = await fetch(`/api/settings/danger-zone?workspaceId=${workspaceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: id, confirmation: true }),
    });
    if (res.ok) {
      setConfirmId(null);
      if (id === 'delete_workspace') window.location.href = '/dashboard';
    }
  };

  const confirmAction = ACTIONS.find((a) => a.id === confirmId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
        <TriangleAlert size={16} className="text-red-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Danger Zone</p>
          <p className="text-xs text-red-600">These actions are irreversible. Proceed with caution.</p>
        </div>
      </div>

      <div className="space-y-3">
        {ACTIONS.map(({ id, icon: Icon, label, desc, color, btnLabel, destructive }) => {
          const c = COLOR_MAP[color];
          return (
            <div key={id} className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${c.border} ${c.bg}`}>
              <div className="flex items-center gap-3">
                <Icon size={16} className={c.text} />
                <div>
                  <p className={`text-sm font-semibold ${c.text}`}>{label}</p>
                  <p className={`text-xs ${c.desc}`}>{desc}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={destructive ? 'destructive' : 'outline'}
                onClick={() => id === 'export_data' ? handleAction(id) : setConfirmId(id)}
                className="flex-shrink-0 ml-4"
              >
                {btnLabel}
              </Button>
            </div>
          );
        })}
      </div>

      {confirmId && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <TriangleAlert size={22} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 text-center mb-2">Are you absolutely sure?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              {confirmId === 'delete_workspace' && 'This will permanently delete your workspace and all data. This cannot be undone.'}
              {confirmId === 'disconnect_whatsapp' && 'This will disconnect your WhatsApp account. You can reconnect later.'}
              {confirmId === 'delete_all_contacts' && 'This will permanently delete all contacts. This cannot be undone.'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setConfirmId(null)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={() => handleAction(confirmId)} className="flex-1">
                Yes, {confirmAction.btnLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
