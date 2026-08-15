import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
interface Provider {
  id: string;
  provider_type: 'social';
  name: string;
  provider_key?: string | null;
  is_enabled: boolean;
  credentials: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}
interface Preset {
  key: string;
  name: string;
  notes: string;
  fields: { key: string; label: string; placeholder: string; type: string; required?: boolean }[];
}
// Social provider presets
const SOCIAL_PRESETS: Preset[] = [
  {
    key: 'youtube',
    name: 'YouTube',
    notes: 'Post videos, shorts, and live streams',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'https://www.googleapis.com/auth/youtube.upload', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/youtube', type: 'text', required: true },
      { key: 'api_key', label: 'API Key (optional)', placeholder: 'your-api-key', type: 'text' },
    ],
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    notes: 'Post videos and reels',
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'your-client-key', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'user.info.basic,video.publish', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/tiktok', type: 'text', required: true },
    ],
  },
  {
    key: 'instagram',
    name: 'Instagram',
    notes: 'Post photos, videos, reels (Business account required)',
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'your-app-id', type: 'text', required: true },
      { key: 'app_secret', label: 'App Secret', placeholder: 'your-app-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'instagram_basic,instagram_content_publish', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/instagram', type: 'text', required: true },
    ],
  },
  {
    key: 'facebook',
    name: 'Facebook',
    notes: 'Post to pages and groups',
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'your-app-id', type: 'text', required: true },
      { key: 'app_secret', label: 'App Secret', placeholder: 'your-app-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'pages_manage_posts,pages_read_engagement', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/facebook', type: 'text', required: true },
    ],
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    notes: 'Post articles and updates',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'r_liteprofile,w_member_social', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/linkedin', type: 'text', required: true },
    ],
  },
  {
    key: 'twitter',
    name: 'X (Twitter)',
    notes: 'Post tweets and media (OAuth 2.0)',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'tweet.read,tweet.write,users.read,offline.access', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/twitter', type: 'text', required: true },
    ],
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    notes: 'Post pins and boards',
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'your-app-id', type: 'text', required: true },
      { key: 'app_secret', label: 'App Secret', placeholder: 'your-app-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'boards:read,pins:read,pins:write', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/pinterest', type: 'text', required: true },
    ],
  },
  {
    key: 'snapchat',
    name: 'Snapchat',
    notes: 'Post stories and ads',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'https://auth.snapchat.com/oauth2/v1/authorize?client_id=...', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/snapchat', type: 'text', required: true },
    ],
  },
  {
    key: 'threads',
    name: 'Threads',
    notes: 'Post text and media threads',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'threads_basic,threads_content_publish', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/threads', type: 'text', required: true },
    ],
  },
  {
    key: 'reddit',
    name: 'Reddit',
    notes: 'Post to subreddits',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'submit,read', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/reddit', type: 'text', required: true },
    ],
  },
  {
    key: 'vimeo',
    name: 'Vimeo',
    notes: 'Post videos',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'public,private,upload', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/vimeo', type: 'text', required: true },
    ],
  },
  {
    key: 'dailymotion',
    name: 'Dailymotion',
    notes: 'Post videos',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'userinfo,manage_videos', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/dailymotion', type: 'text', required: true },
    ],
  },
  {
    key: 'custom_social',
    name: 'Custom Social',
    notes: 'Use any other OAuth 2.0 provider',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'optional-scope', type: 'text' },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/custom', type: 'text', required: true },
      { key: 'auth_url', label: 'Authorization URL (optional)', placeholder: 'https://provider.com/oauth/authorize', type: 'text' },
      { key: 'token_url', label: 'Token URL (optional)', placeholder: 'https://provider.com/oauth/token', type: 'text' },
    ],
  },
];
const SocialPostVideoConfig: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState('youtube');
  const [formName, setFormName] = useState('');
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
  });
  const selectedPreset = SOCIAL_PRESETS.find((p) => p.key === selectedPresetKey) || SOCIAL_PRESETS[0];
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/providers');
      // Filter only social providers
      const all = res.data.data || [];
      const social = all.filter((p: any) => p.provider_type === 'social');
      setProviders(social);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);
  const applyPreset = (key: string) => {
    const preset = SOCIAL_PRESETS.find((p) => p.key === key) || SOCIAL_PRESETS[0];
    setSelectedPresetKey(key);
    setFormName(preset.name);
    const creds: Record<string, string> = {};
    preset.fields.forEach((f) => {
      creds[f.key] = formCredentials[f.key] || '';
    });
    setFormCredentials(creds);
  };
  const resetForm = () => {
    setFormName('');
    setFormCredentials({});
    setEditingId(null);
    setShowForm(false);
    setSelectedPresetKey('youtube');
    setError('');
    setSuccess('');
  };
  const openAddForm = () => {
    resetForm();
    applyPreset('youtube');
    setShowForm(true);
  };
  const openEditForm = (provider: Provider) => {
    setEditingId(provider.id);
    setFormName(provider.name);
    setFormCredentials({ ...provider.credentials });
    if (provider.provider_key) {
      const preset = SOCIAL_PRESETS.find((p) => p.key === provider.provider_key);
      setSelectedPresetKey(preset ? preset.key : 'custom_social');
    } else {
      setSelectedPresetKey('custom_social');
    }
    setShowForm(true);
    setError('');
    setSuccess('');
  };
  const handleCredentialChange = (key: string, value: string) => {
    setFormCredentials((prev) => ({ ...prev, [key]: value }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Provider name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        provider_type: 'social',
        name: formName.trim(),
        credentials: formCredentials,
        provider_key: selectedPresetKey,
        is_enabled: false,
      };
      if (editingId) {
        // Update: only name, credentials, provider_key, is_enabled can be updated
        const updatePayload: any = {
          name: formName.trim(),
          credentials: formCredentials,
          provider_key: selectedPresetKey,
        };
        await api.put(`/providers/${editingId}`, updatePayload);
        setSuccess('Provider updated successfully');
      } else {
        await api.post('/providers', payload);
        setSuccess('Provider added successfully');
      }
      resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };
  const handleToggle = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/providers/${id}/toggle`);
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle provider');
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this social provider?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/providers/${id}`);
      setSuccess('Provider deleted successfully');
      if (editingId === id) resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete provider');
    }
  };
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-glass p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Social Post Video Configuration</h1>
            <p className="text-gray-500 text-sm mt-1">
              Add and configure social media providers for posting videos, reels, and photos
            </p>
          </div>
          {!showForm && (
            <button onClick={openAddForm} className="btn-primary whitespace-nowrap">
              + Add Social Provider
            </button>
          )}
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}
        {showForm && (
          <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? 'Edit Social Provider' : 'Add New Social Provider'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Provider
                </label>
                <select
                  value={selectedPresetKey}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="input-field"
                  disabled={saving || !!editingId}
                >
                  {SOCIAL_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedPreset && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    {selectedPreset.notes}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                  placeholder="e.g., YouTube Production"
                  required
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedPreset.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={formCredentials[field.key] || ''}
                      onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                      className="input-field"
                      placeholder={field.placeholder}
                      required={field.required}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Provider' : 'Add Provider'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No social providers configured yet.</p>
            {!showForm && (
              <button onClick={openAddForm} className="btn-primary">
                Add your first social provider
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => {
              const preset = SOCIAL_PRESETS.find((p) => p.key === provider.provider_key);
              return (
                <div
                  key={provider.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-gray-800 truncate">{provider.name}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          provider.is_enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {provider.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {preset && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {preset.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {Object.entries(provider.credentials)
                        .filter(([k]) => k.includes('client_id') || k.includes('app_id') || k.includes('api_key'))
                        .map(([k, v]) => `${k}: ${v ? '••••' + v.slice(-4) : '—'}`)
                        .join(' • ') || 'No credentials'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(provider.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        provider.is_enabled
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {provider.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(provider)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(provider.id)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default SocialPostVideoConfig;
