'use client';

import { cn } from '@/lib/utils';
import {
  Settings, Building2, Users,
  Bell, Shield, KeyRound, Webhook, TriangleAlert, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'general',       label: 'General',       icon: Settings },
  { id: 'workspace',     label: 'Workspace',     icon: Building2 },
  { id: 'team',          label: 'Team',          icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security',      label: 'Security',      icon: Shield },
  { id: 'api-keys',      label: 'API Keys',      icon: KeyRound },
  { id: 'webhooks',      label: 'Webhooks',      icon: Webhook },
  { id: 'danger-zone',   label: 'Danger Zone',   icon: TriangleAlert },
];

export default function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  const pathname = usePathname();
  const isQuickReplies = pathname === '/dashboard/settings/quick-replies';

  return (
    <div className="w-56 flex-shrink-0">
      <nav className="space-y-0.5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id && !isQuickReplies;
          const danger = id === 'danger-zone';
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? danger
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-600 text-white shadow-sm'
                  : danger
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          );
        })}

        {/* Quick Replies — separate route */}
        <Link
          href="/dashboard/settings/quick-replies"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isQuickReplies
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Zap size={16} strokeWidth={isQuickReplies ? 2.5 : 2} />
          <span>Quick Replies</span>
        </Link>
      </nav>
    </div>
  );
}
