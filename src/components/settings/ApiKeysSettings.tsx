'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KeyRound, Copy, Trash2, Plus, Check } from 'lucide-react';

interface ApiKeysSettingsProps {
  workspaceId: string;
  initialData?: any[];
  onSave?: (data: any) => void;
}

export default function ApiKeysSettings({ workspaceId, initialData = [] }: ApiKeysSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/api-keys?workspaceId=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'API Key' }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys((prev) => [...prev, data.data]);
        setShowModal(false);
        setNewKeyName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    const res = await fetch(`/api/settings/api-keys/${id}?workspaceId=${workspaceId}`, { method: 'DELETE' });
    if (res.ok) setApiKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const handleCopy = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">API Keys</h3>
          <p className="text-sm text-gray-500 mt-0.5">Authenticate requests to the Wexa AI API.</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
          <Plus size={14} /> New Key
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Name', 'Key', 'Last Used', 'Created', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apiKeys.length > 0 ? apiKeys.map((key) => (
              <tr key={key.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{key.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[160px] truncate">{key.key}</td>
                <td className="px-4 py-3 text-gray-500">{key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => handleCopy(key.id, key.key)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                      {copiedId === key.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                    <button onClick={() => handleDelete(key.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center">
                  <KeyRound size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No API keys yet. Generate one to get started.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Generate New API Key</h3>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. Production)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
