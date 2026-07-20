'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ShieldCheck, MonitorSmartphone, LogOut, Clock, Eye, EyeOff } from 'lucide-react';

interface SecuritySettingsProps {
  workspaceId: string;
  initialData?: any;
  onSave?: (data: any) => void;
}

export default function SecuritySettings({ workspaceId, initialData, onSave }: SecuritySettingsProps) {
  const [loading, setLoading] = useState(false);
  const [twoFactor, setTwoFactor] = useState(initialData?.twoFactorEnabled ?? false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleTwoFactor = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/security?workspaceId=${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twoFactorEnabled: !twoFactor }),
      });
      if (res.ok) {
        setTwoFactor(!twoFactor);
        onSave?.((await res.json()).data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
  };

  const toggleShow = (field: keyof typeof showPasswords) =>
    setShowPasswords((p) => ({ ...p, [field]: !p[field] }));

  const passwordFields = [
    { name: 'currentPassword', label: 'Current Password', show: showPasswords.current,  toggle: () => toggleShow('current') },
    { name: 'newPassword',     label: 'New Password',     show: showPasswords.new,      toggle: () => toggleShow('new') },
    { name: 'confirmPassword', label: 'Confirm Password', show: showPasswords.confirm,  toggle: () => toggleShow('confirm') },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Security Settings</h3>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account security and authentication.</p>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={15} className="text-gray-500" />
          <h4 className="text-sm font-semibold text-gray-800">Change Password</h4>
        </div>
        {passwordFields.map(({ name, label, show, toggle }) => (
          <div key={name}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                name={name}
                value={passwordForm[name as keyof typeof passwordForm]}
                onChange={(e) => setPasswordForm((p) => ({ ...p, [name]: e.target.value }))}
                placeholder={`Enter ${label.toLowerCase()}`}
                className="pr-9"
              />
              <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        ))}
        <Button onClick={handlePasswordSubmit} size="sm" className="w-full bg-green-600 hover:bg-green-700 mt-1">
          Update Password
        </Button>
      </div>

      {/* 2FA */}
      <div className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleTwoFactor}
          disabled={loading}
          variant={twoFactor ? 'destructive' : 'default'}
          className={twoFactor ? '' : 'bg-green-600 hover:bg-green-700'}
        >
          {twoFactor ? 'Disable' : 'Enable'}
        </Button>
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <MonitorSmartphone size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Active Sessions</p>
            <p className="text-xs text-gray-500">Manage devices currently logged in</p>
          </div>
        </div>
        <Button size="sm" variant="outline">View Sessions</Button>
      </div>

      {/* Logout All */}
      <div className="rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
            <LogOut size={16} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Logout All Devices</p>
            <p className="text-xs text-gray-500">Sign out from all devices except this one</p>
          </div>
        </div>
        <Button size="sm" variant="outline">Logout All</Button>
      </div>

      {/* Login History */}
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-gray-500" />
          <h4 className="text-sm font-semibold text-gray-800">Recent Login Activity</h4>
        </div>
        <div className="space-y-2">
          {[
            { time: 'Today at 10:30 AM', browser: 'Chrome', location: 'India' },
            { time: '2 days ago',        browser: 'Safari', location: 'India' },
            { time: '5 days ago',        browser: 'Firefox', location: 'USA' },
          ].map((log, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-gray-500 py-1.5 border-b border-gray-100 last:border-0">
              <span>{log.time}</span>
              <span className="text-gray-400">{log.browser} · {log.location}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
