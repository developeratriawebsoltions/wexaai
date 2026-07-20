'use client';

import { Button } from '@/components/ui/button';
import { Building2, Hash, Calendar, Pencil, ArrowRightLeft } from 'lucide-react';

interface WorkspaceSettingsProps {
  workspaceId: string;
  initialData?: any;
  onSave?: (data: any) => void;
}

export default function WorkspaceSettings({ workspaceId, initialData }: WorkspaceSettingsProps) {
  const rows = [
    { icon: Building2, label: 'Workspace Name', value: initialData?.name },
    { icon: Hash,      label: 'Workspace Slug', value: initialData?.slug },
    { icon: Hash,      label: 'Workspace ID',   value: workspaceId, mono: true },
    { icon: Calendar,  label: 'Created',        value: initialData?.createdAt ? new Date(initialData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Workspace Details</h3>
        <p className="text-sm text-gray-500 mt-0.5">View and manage your workspace information.</p>
      </div>

      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {rows.map(({ icon: Icon, label, value, mono }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
              <Icon size={15} className="text-gray-400" />
              {label}
            </div>
            <span className={`text-sm text-gray-500 ${mono ? 'font-mono text-xs bg-gray-100 px-2 py-0.5 rounded' : ''}`}>
              {value || 'N/A'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-2 text-sm">
          <Pencil size={14} /> Rename Workspace
        </Button>
        <Button variant="outline" className="flex-1 gap-2 text-sm">
          <ArrowRightLeft size={14} /> Transfer Ownership
        </Button>
      </div>
    </div>
  );
}
