'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, MessagesSquare, Radio, CreditCard, Save } from 'lucide-react';

interface NotificationSettingsProps {
  workspaceId: string;
  initialData?: any;
  onSave?: (data: any) => void;
}

const ITEMS = [
  { key: 'emailNotifications', label: 'Email Notifications',  desc: 'Receive email alerts for important events',       icon: Mail },
  { key: 'whatsappAlerts',     label: 'WhatsApp Alerts',      desc: 'Receive alerts via WhatsApp',                    icon: MessageCircle },
  { key: 'newConversation',    label: 'New Conversation',     desc: 'Notify when a new conversation starts',          icon: MessagesSquare },
  { key: 'broadcastCompleted', label: 'Broadcast Completed',  desc: 'Notify when broadcast campaigns finish',         icon: Radio },
  { key: 'paymentFailed',      label: 'Payment Failed',       desc: 'Alert when a payment fails',                     icon: CreditCard },
];

export default function NotificationSettings({ workspaceId, initialData, onSave }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    emailNotifications: initialData?.emailNotifications ?? true,
    whatsappAlerts:     initialData?.whatsappAlerts     ?? false,
    newConversation:    initialData?.newConversation    ?? true,
    broadcastCompleted: initialData?.broadcastCompleted ?? true,
    paymentFailed:      initialData?.paymentFailed      ?? true,
  });

  const toggle = (key: string) =>
    setFormData((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/notifications?workspaceId=${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        onSave?.((await res.json()).data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Notification Preferences</h3>
        <p className="text-sm text-gray-500 mt-0.5">Choose how and when you want to be notified.</p>
      </div>

      <div className="space-y-2">
        {ITEMS.map(({ key, label, desc, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Icon size={15} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${
                formData[key as keyof typeof formData] ? 'bg-green-500' : 'bg-gray-200'
              }`}
              style={{ width: 40, height: 22 }}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${
                  formData[key as keyof typeof formData] ? 'translate-x-[18px]' : 'translate-x-0'
                }`}
                style={{ width: 18, height: 18 }}
              />
            </button>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700">
        <Save size={15} />
        {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
      </Button>
    </div>
  );
}
