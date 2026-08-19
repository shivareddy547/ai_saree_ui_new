import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
interface Provider {
  id: string;
  provider_type: 'shipment';
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
  environments?: string[];
}
const SHIPMENT_PRESETS: Preset[] = [
  {
    key: 'shiprocket',
    name: 'Shiprocket',
    notes: 'Shiprocket shipping platform. Get Email and Password (or API token) from Shiprocket Dashboard → Settings → API. Use sandbox credentials for testing.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'email', label: 'Email / API User', placeholder: 'your-shiprocket-email', type: 'text', required: true },
      { key: 'password', label: 'Password / API Password', placeholder: 'your-api-password', type: 'password', required: true },
      { key: 'channel_id', label: 'Channel ID (optional)', placeholder: 'optional-channel-id', type: 'text' },
    ],
  },
  {
    key: 'delhivery',
    name: 'Delhivery',
    notes: 'Delhivery logistics. Get API Token from Delhivery Dashboard → Settings → API. Use test token for sandbox.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'api_token', label: 'API Token', placeholder: 'your-delhivery-api-token', type: 'password', required: true },
      { key: 'client_name', label: 'Client Name (optional)', placeholder: 'your-client-name', type: 'text' },
    ],
  },
  {
    key: 'bluedart',
    name: 'BlueDart',
    notes: 'BlueDart Express. Obtain Login ID, Licence Key and Customer Code from BlueDart API credentials.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'login_id', label: 'Login ID', placeholder: 'your-login-id', type: 'text', required: true },
      { key: 'licence_key', label: 'Licence Key', placeholder: 'your-licence-key', type: 'password', required: true },
      { key: 'customer_code', label: 'Customer Code', placeholder: 'your-customer-code', type: 'text', required: true },
    ],
  },
  {
    key: 'indiapost',
    name: 'India Post',
    notes: 'India Post (Speed Post / Parcel). Configure with your merchant credentials if available. Mostly used for tracking reference.',
    environments: ['production'],
    fields: [
      { key: 'merchant_id', label: 'Merchant ID (optional)', placeholder: 'your-merchant-id', type: 'text' },
      { key: 'api_key', label: 'API Key (optional)', placeholder: 'your-api-key', type: 'password' },
    ],
  },
  {
    key: 'dtdc',
    name: 'DTDC',
    notes: 'DTDC Courier. Get Customer Code and API Key from DTDC Partner Portal.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'customer_code', label: 'Customer Code', placeholder: 'your-customer-code', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', placeholder: 'your-api-key', type: 'password', required: true },
    ],
  },
  {
    key: 'easyship',
    name: 'Easyship',
    notes: 'Easyship multi-carrier platform. Create API Access Token from Easyship Dashboard → Connect → API.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'api_token', label: 'API Access Token', placeholder: 'your-easyship-token', type: 'password', required: true },
      { key: 'company_id', label: 'Company ID (optional)', placeholder: 'optional-company-id', type: 'text' },
    ],
  },
  {
    key: 'custom_shipment',
    name: 'Custom Shipment',
    notes: 'Use for any other shipment / courier provider. Store all required credentials as key-value pairs.',
    environments: ['production', 'sandbox', 'testing'],
    fields: [
      { key: 'api_key', label: 'API Key / Client ID', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret / Client Secret', placeholder: 'your-api-secret', type: 'password', required: true },
      { key: 'account_id', label: 'Account / Merchant ID (optional)', placeholder: 'optional-account-id', type: 'text' },
      { key: 'webhook_secret', label: 'Webhook Secret (optional)', placeholder: 'optional-webhook-secret', type: 'password' },
    ],
  },
];
const ShipmentProvidersSetup: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState('shiprocket');
  const [formName, setFormName] = useState('');
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formEnvironment, setFormEnvironment] = useState('production');
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true,
  });
  const selectedPreset = SHIPMENT_PRESETS.find((p) => p.key === selectedPresetKey) || SHIPMENT_PRESETS[0];
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/providers');
      const all = res.data.data || [];
      const shipment = all.filter((p: any) => p.provider_type === 'shipment');
      setProviders(shipment);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load shipment providers');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);
  const applyPreset = (key: string) => {
    const preset = SHIPMENT_PRESETS.find((p) => p.key === key) || SHIPMENT_PRESETS[0];
    setSelectedPresetKey(key);
    setFormName(preset.name);
    const defaultEnv =
      preset.environments && preset.environments.includes('production')
        ? 'production'
        : preset.environments?.[0] || 'production';
    setFormEnvironment(defaultEnv);
    const creds: Record<string, string> = {};
    preset.fields.forEach((f) => {
      creds[f.key] = formCredentials[f.key] || '';
    });
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
    setSelectedPresetKey('shiprocket');
    setError('');
    setSuccess('');
  };
  const openAddForm = () => {
    resetForm();
    applyPreset('shiprocket');
    setShowForm(true);
  };
  const openEditForm = (provider: Provider) => {
    setEditingId(provider.id);
    setFormName(provider.name);
    setFormCredentials({ ...provider.credentials });
    if (provider.credentials.environment) {
      setFormEnvironment(provider.credentials.environment);
    } else {
      const preset = SHIPMENT_PRESETS.find((p) => p.key === provider.provider_key);
      if (preset && preset.environments && preset.environments.length > 0) {
        setFormEnvironment(preset.environments[0]);
      } else {
        setFormEnvironment('production');
      }
    }
    if (provider.provider_key) {
      const preset = SHIPMENT_PRESETS.find((p) => p.key === provider.provider_key);
      setSelectedPresetKey(preset ? preset.key : 'custom_shipment');
    } else {
      setSelectedPresetKey('custom_shipment');
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
      const credentialsWithEnv = { ...formCredentials, environment: formEnvironment };
      const payload: any = {
        provider_type: 'shipment',
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
        setSuccess('Shipment provider updated successfully');
      } else {
        await api.post('/providers', payload);
        setSuccess('Shipment provider added successfully');
      }
      resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save shipment provider');
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
      setError(err.response?.data?.message || 'Failed to toggle shipment provider');
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shipment provider?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/providers/${id}`);
      setSuccess('Shipment provider deleted successfully');
      if (editingId === id) resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete shipment provider');
    }
  };
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-glass p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Shipment Providers Setup</h1>
            <p className="text-gray-500 text-sm mt-1">
              Add and configure shipment / courier providers for your store. Credentials are stored securely and used when creating shipments and tracking.
            </p>
          </div>
          {!showForm && (
            <button onClick={openAddForm} className="btn-primary whitespace-nowrap self-start sm:self-auto">
              + Add Shipment Provider
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
          <div className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {editingId ? 'Edit Shipment Provider' : 'Add New Shipment Provider'}
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
                  {SHIPMENT_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedPreset && (
                  <p className="text-xs text-gray-500 mt-1.5">{selectedPreset.notes}</p>
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
                  placeholder="e.g., Shiprocket Sandbox / Delhivery Live"
                  required
                  disabled={saving}
                />
              </div>
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
                  Select the environment for this provider (sandbox for testing, production for live).
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
              {selectedPresetKey === 'shiprocket' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Shiprocket setup tips</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Use the same email/password you use to log into Shiprocket, or generate an API user.</li>
                    <li>Start with <strong>Sandbox</strong> environment for testing.</li>
                    <li>After saving, Enable the provider so it can be selected for order shipments.</li>
                  </ul>
                </div>
              )}
              {selectedPresetKey === 'delhivery' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">Delhivery setup checklist</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Generate API Token from Delhivery client portal.</li>
                    <li>Use test token with Sandbox environment first.</li>
                    <li>Enable the provider after saving to make it available for shipping.</li>
                  </ul>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
          <div className="text-center py-12 text-gray-500">Loading shipment providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No shipment providers configured yet.</p>
            {!showForm && (
              <button onClick={openAddForm} className="btn-primary">
                Add your first shipment provider
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => {
              const preset = SHIPMENT_PRESETS.find((p) => p.key === provider.provider_key);
              const environment = provider.credentials?.environment || 'production';
              return (
                <div
                  key={provider.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {environment.charAt(0).toUpperCase() + environment.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {Object.entries(provider.credentials)
                        .filter(
                          ([k]) =>
                            k !== 'environment' &&
                            (k.includes('key') ||
                              k.includes('id') ||
                              k.includes('token') ||
                              k.includes('email') ||
                              k.includes('login') ||
                              k.includes('customer') ||
                              k.includes('account') ||
                              k.includes('client'))
                        )
                        .map(([k, v]) => `${k}: ${v ? '••••' + String(v).slice(-4) : '—'}`)
                        .join(' • ') || 'No credentials'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
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
export default ShipmentProvidersSetup;
