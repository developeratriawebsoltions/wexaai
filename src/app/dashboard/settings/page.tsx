'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  SettingsSidebar,
  GeneralSettings,
  WorkspaceSettings,
  TeamSettings,
  NotificationSettings,
  SecuritySettings,
  ApiKeysSettings,
  DangerZoneSettings,
} from '@/components/settings';

export default function DashboardSettingsPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [settingsData, setSettingsData] = useState<any>(null);

  useEffect(() => {
    if (workspaceId) fetchSettings();
  }, [workspaceId]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings?workspaceId=${workspaceId}`);
      if (res.ok) setSettingsData(await res.json());
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const props = { workspaceId, onSave: fetchSettings };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':       return <GeneralSettings      {...props} initialData={settingsData?.settings} />;
      case 'workspace':     return <WorkspaceSettings    {...props} initialData={settingsData?.workspace} />;
      case 'team':          return <TeamSettings         {...props} members={settingsData?.team?.members} />;
      case 'notifications': return <NotificationSettings {...props} initialData={settingsData?.notifications} />;
      case 'security':      return <SecuritySettings     {...props} initialData={settingsData?.security} />;
      case 'api-keys':      return <ApiKeysSettings      {...props} initialData={settingsData?.apiKeys} />;
      case 'danger-zone':   return <DangerZoneSettings   workspaceId={workspaceId} />;
      default:              return <GeneralSettings      {...props} initialData={settingsData?.settings} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your Wexa AI workspace preferences</p>
      </div>

      <div className="flex flex-1 gap-5 px-6 pb-6 overflow-hidden">
        {/* Sidebar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 h-fit">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-400">Loading settings...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </div>
  );
}
