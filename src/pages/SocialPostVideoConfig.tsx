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
interface SocialConnection {
  id: string;
  providerId: string;
  providerType: string;
  accountId?: string;
  username?: string;
  accountType?: string;
  tokenExpiresAt?: string;
  connected: boolean;
  error?: string;
}
interface Preset {
  key: string;
  name: string;
  notes: string;
  fields: { key: string; label: string; placeholder: string; type: string; required?: boolean }[];
  environments?: string[]; // optional list of supported environments
}
const SOCIAL_PRESETS: Preset[] = [
  {
    key: 'youtube',
    name: 'YouTube',
    notes: 'Post videos, shorts, and live streams. Use scope: https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly (or https://www.googleapis.com/auth/youtube). Redirect URI must exactly match the one registered in Google Cloud Console. Enable YouTube Data API v3.',
    environments: ['production', 'testing'],
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/youtube', type: 'text', required: true },
      { key: 'api_key', label: 'API Key (optional)', placeholder: 'your-api-key', type: 'text' },
    ],
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    notes: 'Post videos and reels',
    environments: ['production', 'sandbox'],
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
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'app_id', label: 'App ID', placeholder: 'your-app-id', type: 'text', required: true },
      { key: 'app_secret', label: 'App Secret', placeholder: 'your-app-secret', type: 'password', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'instagram_business_basic,instagram_business_content_publish', type: 'text', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', placeholder: 'https://your-app.com/oauth/instagram', type: 'text', required: true },
    ],
  },
  {
    key: 'facebook',
    name: 'Facebook',
    notes: 'Post to pages and groups',
    environments: ['production', 'sandbox'],
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
    environments: ['production', 'testing'],
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
    environments: ['production', 'testing'],
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
    environments: ['production', 'sandbox'],
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
    environments: ['production', 'sandbox'],
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
    environments: ['production', 'testing'],
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
    environments: ['production', 'sandbox'],
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
    environments: ['production', 'testing'],
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
    environments: ['production', 'testing'],
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
    environments: ['production', 'sandbox', 'testing'],
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
  const [connections, setConnections] = useState<{ [providerId: string]: SocialConnection }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState('youtube');
  const [formName, setFormName] = useState('');
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formEnvironment, setFormEnvironment] = useState('production');
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  // Axios instance for authenticated requests (sends token and credentials)
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true, // send cookies for cross-origin
  });
  // Public instance for endpoints that don't require auth (also with credentials if needed)
  const publicApi = axios.create({
    baseURL: apiBase,
    withCredentials: true,
  });
  const selectedPreset = SOCIAL_PRESETS.find((p) => p.key === selectedPresetKey) || SOCIAL_PRESETS[0];
  // Fetch providers - use authenticated instance (matches SetupProviders pattern)
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/providers');
      const all = res.data.data || [];
      const social = all.filter((p: any) => p.provider_type === 'social');
      setProviders(social);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);
  // Fetch user's social connections (requires auth)
  const fetchConnections = useCallback(async () => {
    try {
      const res = await api.get('/social/status');
      if (res.data.success) {
        const conns = res.data.data || [];
        const map: { [id: string]: SocialConnection } = {};
        conns.forEach((c: any) => {
          map[c.providerId] = {
            id: c.id,
            providerId: c.providerId,
            providerType: c.providerType,
            accountId: c.accountId,
            username: c.username,
            accountType: c.accountType,
            tokenExpiresAt: c.tokenExpiresAt,
            connected: c.connected,
            error: c.error,
          };
        });
        setConnections(map);
      }
    } catch (err: any) {
      console.error('Failed to fetch connections:', err);
    }
  }, []);
  useEffect(() => {
    fetchProviders();
    fetchConnections();
  }, [fetchProviders, fetchConnections]);
  const applyPreset = (key: string) => {
    const preset = SOCIAL_PRESETS.find((p) => p.key === key) || SOCIAL_PRESETS[0];
    setSelectedPresetKey(key);
    setFormName(preset.name);
    // Reset environment to default (production) unless we are editing
    const defaultEnv = preset.environments && preset.environments.includes('production') ? 'production' : (preset.environments?.[0] || 'production');
    setFormEnvironment(defaultEnv);
    const creds: Record<string, string> = {};
    preset.fields.forEach((f) => {
      // Prefer existing form value, otherwise use improved default for YouTube scope
      if (key === 'youtube' && f.key === 'scope' && !formCredentials[f.key]) {
        creds[f.key] = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
      } else {
        creds[f.key] = formCredentials[f.key] || '';
      }
    });
    // Preserve environment if it exists in current credentials (for editing)
    if (formCredentials.environment) {
      setFormEnvironment(formCredentials.environment);
    }
    setFormCredentials(creds);
  };
  const resetForm = () => {
    setFormName('');
    setFormCredentials({});
    setFormEnvironment('production');
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
    // Set environment from credentials if exists
    if (provider.credentials.environment) {
      setFormEnvironment(provider.credentials.environment);
    } else {
      // set to default for this preset
      const preset = SOCIAL_PRESETS.find((p) => p.key === provider.provider_key);
      if (preset && preset.environments && preset.environments.length > 0) {
        setFormEnvironment(preset.environments[0]);
      } else {
        setFormEnvironment('production');
      }
    }
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
      // Merge credentials with environment
      const credentialsWithEnv = { ...formCredentials, environment: formEnvironment };
      const payload: any = {
        provider_type: 'social',
        name: formName.trim(),
        credentials: credentialsWithEnv,
        provider_key: selectedPresetKey,
        is_enabled: false,
      };
      if (editingId) {
        const updatePayload: any = {
          name: formName.trim(),
          credentials: credentialsWithEnv,
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
  // --- OAuth Connect logic ---
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');
  const openAuthPopup = async (providerId: string) => {
    setError('');
    setIsConnecting(providerId);
    try {
      const response = await api.get(`/social/oauth-url/${providerId}`);
      if (response.data.success) {
        const url = response.data.data.url;
        setAuthUrl(url);
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          url,
          'social-auth',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`
        );
        if (!popup) {
          setError('Please allow popups for this website');
          setIsConnecting(null);
          return;
        }
        setPopupWindow(popup);
        // Monitor popup close
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            setPopupWindow(null);
            setIsConnecting(null);
            // Refresh connections
            fetchConnections();
          }
        }, 500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to initiate connection';
      setError(
        msg.includes('YouTube channel info')
          ? `${msg}. Check: 1) Scope includes youtube.readonly or youtube, 2) Redirect URI matches Google Cloud Console exactly, 3) YouTube Data API v3 is enabled, 4) Credentials are correct.`
          : msg
      );
      setIsConnecting(null);
    }
  };
  // Handle OAuth callback from popup (redirect uri)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');
      if (errorParam) {
        setError(`Authorization failed: ${errorParam}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
      if (code && state) {
        // State may contain providerId (we can store it in state)
        // For simplicity, we'll assume providerId is stored in state and we can extract
        // Alternatively, we can call a generic connect endpoint that uses the provider from the oauth-url call.
        // We'll use the state to pass providerId.
        try {
          const response = await api.post('/social/connect', { code, state });
          if (response.data.success) {
            setSuccess('Social account connected successfully!');
            await fetchConnections();
          }
        } catch (err: any) {
          const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to connect account';
          setError(
            msg.includes('YouTube channel info') || msg.includes('Failed to fetch YouTube')
              ? `${msg}. Fix tips: Ensure Scope contains https://www.googleapis.com/auth/youtube.upload and https://www.googleapis.com/auth/youtube.readonly (or https://www.googleapis.com/auth/youtube). Redirect URI must match Google Cloud Console. Enable YouTube Data API v3. Re-save provider credentials then try Connect again.`
              : msg
          );
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };
    handleOAuthCallback();
  }, []);
  const handleDisconnect = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to disconnect this account?')) return;
    try {
      await api.delete(`/social/disconnect/${connectionId}`);
      setSuccess('Disconnected successfully');
      await fetchConnections();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disconnect');
    }
  };
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-glass p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Social Post Video Configuration</h1>
            <p className="text-gray-500 text-sm mt-1">
              Add and configure social media providers, then connect your accounts
            </p>
          </div>
          {!showForm && (
            <button onClick={openAddForm} className="btn-primary whitespace-nowrap">
              + Add Social Provider
            </button>
          )}
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 whitespace-pre-wrap">
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
              {/* Environment Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environment
                </label>
                <select
                  value={formEnvironment}
                  onChange={(e) => setFormEnvironment(e.target.value)}
                  className="input-field"
                  disabled={saving}
                >
                  {selectedPreset.environments && selectedPreset.environments.length > 0 ? (
                    selectedPreset.environments.map((env) => (
                      <option key={env} value={env}>
                        {env.charAt(0).toUpperCase() + env.slice(1)}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="production">Production</option>
                      <option value="sandbox">Sandbox</option>
                      <option value="testing">Testing</option>
                    </>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Select the environment for this provider (e.g., sandbox for testing, production for live).
                </p>
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
              {selectedPresetKey === 'youtube' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">YouTube connection checklist</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Scope must include <code className="bg-amber-100 px-1 rounded">youtube.upload</code> and <code className="bg-amber-100 px-1 rounded">youtube.readonly</code> (or use <code className="bg-amber-100 px-1 rounded">https://www.googleapis.com/auth/youtube</code>)</li>
                    <li>Redirect URI must exactly match the Authorized redirect URI in Google Cloud Console</li>
                    <li>Enable YouTube Data API v3 in Google Cloud Console</li>
                    <li>After changing credentials, Disable → Enable the provider, then click Connect again</li>
                  </ul>
                </div>
              )}
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
              const connection = connections[provider.id];
              const isConnected = connection?.connected || false;
              const environment = provider.credentials?.environment || 'production';
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
                      {isConnected && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          Connected {connection.username ? `as @${connection.username}` : ''}
                        </span>
                      )}
                      {connection?.error && !isConnected && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700" title={connection.error}>
                          Connection error
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {environment.charAt(0).toUpperCase() + environment.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {Object.entries(provider.credentials)
                        .filter(([k]) => k !== 'environment' && (k.includes('client_id') || k.includes('app_id') || k.includes('api_key')))
                        .map(([k, v]) => `${k}: ${v ? '••••' + v.slice(-4) : '—'}`)
                        .join(' • ') || 'No credentials'}
                    </p>
                    {connection?.error && !isConnected && (
                      <p className="text-xs text-red-500 mt-1 truncate" title={connection.error}>
                        {connection.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {provider.is_enabled && (
                      <>
                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnect(connection.id)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-all"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => openAuthPopup(provider.id)}
                            disabled={isConnecting === provider.id}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex items-center gap-1"
                          >
                            {isConnecting === provider.id ? (
                              <span className="inline-block h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mr-1"></span>
                            ) : null}
                            Connect
                          </button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditForm(provider)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all"
                    >
                      Configure
                    </button>
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
