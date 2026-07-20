'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Phone, Clock, Globe, ImageIcon, Save } from 'lucide-react';

interface GeneralSettingsProps {
  workspaceId: string;
  initialData?: any;
  onSave?: (data: any) => void;
}

export default function GeneralSettings({ workspaceId, initialData, onSave }: GeneralSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    email:    initialData?.email    || '',
    phone:    initialData?.phone    || '',
    timezone: initialData?.timezone || 'Asia/Kolkata',
    language: initialData?.language || 'en',
    logo:     initialData?.logo     || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/general?workspaceId=${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        onSave?.(data.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'email',    label: 'Business Email',  type: 'email', placeholder: 'support@company.com', icon: Mail },
    { name: 'phone',    label: 'Phone Number',     type: 'tel',   placeholder: '+91 XXXXX XXXXX',     icon: Phone },
    { name: 'logo',     label: 'Logo URL',         type: 'url',   placeholder: 'https://example.com/logo.png', icon: ImageIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Business Information</h3>
        <p className="text-sm text-gray-500 mt-0.5">Update your business contact details and preferences.</p>
      </div>

      <div className="space-y-4">
        {fields.map(({ name, label, type, placeholder, icon: Icon }) => (
          <div key={name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
              <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                name={name}
                type={type}
                value={formData[name as keyof typeof formData]}
                onChange={handleChange}
                placeholder={placeholder}
                className="pl-9"
              />
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><Clock size={14} /> Timezone</span>
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5"><Globe size={14} /> Language</span>
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading} className="gap-2 bg-green-600 hover:bg-green-700">
        <Save size={15} />
        {loading ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </Button>
    </div>
  );
}
