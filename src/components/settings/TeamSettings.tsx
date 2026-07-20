'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Trash2, Mail, ChevronDown } from 'lucide-react';

interface TeamSettingsProps {
  workspaceId: string;
  members?: any[];
  onSave?: (data: any) => void;
}

const ROLE_COLORS: Record<string, string> = {
  owner:   'bg-purple-100 text-purple-700',
  admin:   'bg-blue-100 text-blue-700',
  support: 'bg-green-100 text-green-700',
};

export default function TeamSettings({ workspaceId, members = [] }: TeamSettingsProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('support');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Team Members</h3>
          <p className="text-sm text-gray-500 mt-0.5">Manage who has access to your workspace.</p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
          <UserPlus size={14} /> Invite Member
        </Button>
      </div>

      {showInvite && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">Invite a new member</p>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="relative">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="admin">Admin</option>
              <option value="support">Support</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInvite(false)} className="flex-1">Cancel</Button>
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">Send Invite</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {members.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Member', 'Role', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                        {m.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-400">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-10 text-center">
            <Users size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No team members yet. Invite someone to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
