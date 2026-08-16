import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
interface Provider {
  id: string;
  provider_type: 'smtp' | 'sms';
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
// SMTP presets
const SMTP_PRESETS: Preset[] = [
  {
    key: 'brevo',
    name: 'Brevo (Sendinblue)',
    notes: '300 emails/day free • Small businesses',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp-relay.brevo.com', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '587', type: 'text', required: true },
      { key: 'encryption', label: 'Encryption', placeholder: 'STARTTLS', type: 'text' },
      { key: 'username', label: 'SMTP Login / Email', placeholder: 'your-brevo-login', type: 'text', required: true },
      { key: 'password', label: 'SMTP Key / Password', placeholder: 'xkeysib-...', type: 'password', required: true },
      { key: 'from_email', label: 'From Email', placeholder: 'noreply@yourdomain.com', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', placeholder: 'My App', type: 'text' },
    ],
  },
  {
    key: 'mailgun',
    name: 'Mailgun',
    notes: 'Limited trial • Developers • Pay-as-you-go',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp.mailgun.org', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '587', type: 'text', required: true },
      { key: 'encryption', label: 'Encryption', placeholder: 'STARTTLS', type: 'text' },
      { key: 'username', label: 'SMTP Username', placeholder: 'postmaster@yourdomain.mailgun.org', type: 'text', required: true },
      { key: 'password', label: 'SMTP Password', placeholder: 'your-mailgun-smtp-password', type: 'password', required: true },
      { key: 'from_email', label: 'From Email', placeholder: 'noreply@yourdomain.com', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', placeholder: 'My App', type: 'text' },
    ],
  },
  {
    key: 'sendgrid',
    name: 'SendGrid',
    notes: 'Limited free • Transactional + marketing',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp.sendgrid.net', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '587', type: 'text', required: true },
      { key: 'encryption', label: 'Encryption', placeholder: 'STARTTLS', type: 'text' },
      { key: 'username', label: 'Username', placeholder: 'apikey', type: 'text', required: true },
      { key: 'password', label: 'API Key', placeholder: 'SG....', type: 'password', required: true },
      { key: 'from_email', label: 'From Email (Verified)', placeholder: 'noreply@yourdomain.com', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', placeholder: 'My App', type: 'text' },
    ],
  },
  {
    key: 'amazon_ses',
    name: 'Amazon SES',
    notes: 'Very low cost (~$0.10 / 1,000 emails) • High-volume',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'email-smtp.us-east-1.amazonaws.com', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '587', type: 'text', required: true },
      { key: 'encryption', label: 'Encryption', placeholder: 'STARTTLS', type: 'text' },
      { key: 'username', label: 'SMTP Username (IAM)', placeholder: 'AKIA...', type: 'text', required: true },
      { key: 'password', label: 'SMTP Password', placeholder: 'your-ses-smtp-password', type: 'password', required: true },
      { key: 'region', label: 'AWS Region', placeholder: 'us-east-1', type: 'text' },
      { key: 'from_email', label: 'From Email (Verified)', placeholder: 'noreply@yourdomain.com', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', placeholder: 'My App', type: 'text' },
    ],
  },
  {
    key: 'postmark',
    name: 'Postmark',
    notes: 'Trial available • Best for transactional emails',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp.postmarkapp.com', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '587', type: 'text', required: true },
      { key: 'encryption', label: 'Encryption', placeholder: 'STARTTLS', type: 'text' },
      { key: 'username', label: 'Server API Token', placeholder: 'your-server-token', type: 'text', required: true },
      { key: 'password', label: 'Server API Token (again)', placeholder: 'your-server-token', type: 'password', required: true },
      { key: 'from_email', label: 'From Email (Verified)', placeholder: 'noreply@yourdomain.com', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', placeholder: 'My App', type: 'text' },
    ],
  },
  {
    key: 'custom',
    name: 'Custom SMTP',
    notes: 'Use any other SMTP server',
    fields: [
      { key: 'host', label: 'SMTP Host', placeholder: 'smtp.example.com', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '587', type: 'text', required: true },
      { key: 'encryption', label: 'Encryption', placeholder: 'STARTTLS / SSL / None', type: 'text' },
      { key: 'username', label: 'Username', placeholder: 'user@example.com', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password', required: true },
      { key: 'from_email', label: 'From Email', placeholder: 'noreply@example.com', type: 'text', required: true },
      { key: 'from_name', label: 'From Name', placeholder: 'My App', type: 'text' },
    ],
  },
];
// SMS presets
const SMS_PRESETS: Preset[] = [
  {
    key: 'twilio',
    name: 'Twilio',
    notes: 'Global • Premium • REST API',
    fields: [
      { key: 'account_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxx', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', placeholder: '••••••••', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'vonage',
    name: 'Vonage (Nexmo)',
    notes: '200+ countries • Mid-range',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret', placeholder: 'your-api-secret', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'messagebird',
    name: 'MessageBird',
    notes: '220+ countries • Mid-range',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'plivo',
    name: 'Plivo',
    notes: '190+ countries • Affordable',
    fields: [
      { key: 'auth_id', label: 'Auth ID', placeholder: 'your-auth-id', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', placeholder: 'your-auth-token', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'infobip',
    name: 'Infobip',
    notes: 'Global • Enterprise',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'sinch',
    name: 'Sinch',
    notes: 'Global • Enterprise',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret', placeholder: 'your-api-secret', type: 'password', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'telnyx',
    name: 'Telnyx',
    notes: 'Global • Competitive',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'aws_sns',
    name: 'AWS SNS SMS',
    notes: 'Global • Low cost',
    fields: [
      { key: 'access_key', label: 'Access Key', placeholder: 'AKIA...', type: 'text', required: true },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'your-secret-key', type: 'password', required: true },
      { key: 'region', label: 'Region', placeholder: 'us-east-1', type: 'text', required: true },
      { key: 'from_number', label: 'From Number', placeholder: '+1234567890', type: 'text', required: true },
    ],
  },
  {
    key: 'textlocal',
    name: 'Textlocal',
    notes: 'India, UK • Good for India',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'sender_id', label: 'Sender ID', placeholder: 'SENDER', type: 'text', required: true },
    ],
  },
  {
    key: 'msg91',
    name: 'MSG91',
    notes: 'India • Very popular',
    fields: [
      { key: 'auth_key', label: 'Auth Key', placeholder: 'your-auth-key', type: 'text', required: true },
      { key: 'sender_id', label: 'Sender ID', placeholder: 'SENDER', type: 'text', required: true },
    ],
  },
  {
    key: 'exotel',
    name: 'Exotel',
    notes: 'India • Popular with startups',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'api_token', label: 'API Token', placeholder: 'your-api-token', type: 'password', required: true },
      { key: 'sender_id', label: 'Sender ID', placeholder: 'SENDER', type: 'text', required: true },
    ],
  },
  {
    key: 'custom_sms',
    name: 'Custom SMS',
    notes: 'Use any other SMS provider',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret', placeholder: 'your-api-secret', type: 'password' },
      { key: 'sender_id', label: 'Sender ID', placeholder: 'SENDER', type: 'text', required: true },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://api.provider.com', type: 'text' },
    ],
  },
];
const SetupProviders: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'smtp' | 'sms'>('smtp');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState('brevo');
  const [formName, setFormName] = useState('');
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  // Axios instance with credentials and authorization
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true, // send cookies for cross-origin
  });
  const getPresets = () => (activeTab === 'smtp' ? SMTP_PRESETS : SMS_PRESETS);
  const selectedPreset = getPresets().find((p) => p.key === selectedPresetKey) || getPresets()[0];
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/providers');
      setProviders(res.data.data || []);
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
    const preset = getPresets().find((p) => p.key === key) || getPresets()[0];
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
    setSelectedPresetKey(activeTab === 'smtp' ? 'brevo' : 'twilio');
    setError('');
    setSuccess('');
  };
  const openAddForm = () => {
    resetForm();
    if (activeTab === 'smtp') {
      applyPreset('brevo');
    } else {
      applyPreset('twilio');
    }
    setShowForm(true);
  };
  const openEditForm = (provider: Provider) => {
    setEditingId(provider.id);
    setFormName(provider.name);
    setFormCredentials({ ...provider.credentials });
    setActiveTab(provider.provider_type);
    if (provider.provider_key) {
      const preset = getPresets().find((p) => p.key === provider.provider_key);
      setSelectedPresetKey(preset ? preset.key : (activeTab === 'smtp' ? 'custom' : 'custom_sms'));
    } else {
      setSelectedPresetKey(activeTab === 'smtp' ? 'custom' : 'custom_sms');
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
        name: formName.trim(),
        credentials: formCredentials,
      };
      if (editingId) {
        // For update, we only allow name, credentials, and provider_key
        payload.provider_key = selectedPresetKey;
        await api.put(`/providers/${editingId}`, payload);
        setSuccess('Provider updated successfully');
      } else {
        payload.provider_type = activeTab;
        payload.is_enabled = false;
        payload.provider_key = selectedPresetKey;
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
    if (!window.confirm('Are you sure you want to delete this provider?')) return;
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
  const filteredProviders = providers.filter((p) => p.provider_type === activeTab);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-glass p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">SMTP / SMS Providers</h1>
            <p className="text-gray-500 text-sm mt-1">
              Add, enable and configure email SMTP and SMS providers
            </p>
          </div>
          {!showForm && (
            <button onClick={openAddForm} className="btn-primary whitespace-nowrap">
              + Add {activeTab === 'smtp' ? 'SMTP' : 'SMS'} Provider
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
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('smtp');
              if (!editingId) resetForm();
            }}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'smtp'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            SMTP (Email)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('sms');
              if (!editingId) resetForm();
            }}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'sms'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            SMS
          </button>
        </div>
        {showForm && (
          <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId
                ? 'Edit Provider'
                : `Add New ${activeTab === 'smtp' ? 'SMTP' : 'SMS'} Provider`}
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
                  {getPresets().map((p) => (
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
                  placeholder={
                    activeTab === 'smtp'
                      ? 'e.g. Brevo Production'
                      : 'e.g. Twilio Primary'
                  }
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
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No {activeTab === 'smtp' ? 'SMTP' : 'SMS'} providers configured yet.
            </p>
            {!showForm && (
              <button onClick={openAddForm} className="btn-primary">
                Add your first provider
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProviders.map((provider) => {
              const preset = getPresets().find((p) => p.key === provider.provider_key);
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
                    <p className="text-sm text-gray-500 mt-1">
                      {provider.provider_type === 'smtp'
                        ? `Host: ${provider.credentials?.host || '—'} • Port: ${provider.credentials?.port || '—'} • From: ${provider.credentials?.from_email || '—'}`
                        : `Sender: ${provider.credentials?.sender_id || provider.credentials?.from_number || '—'} • Key: ${
                            provider.credentials?.api_key || provider.credentials?.auth_token
                              ? '••••' + String(provider.credentials?.api_key || provider.credentials?.auth_token || '').slice(-4)
                              : '—'
                          }`}
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
export default SetupProviders;
