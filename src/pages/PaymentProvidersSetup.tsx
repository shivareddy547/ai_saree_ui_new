import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
interface Provider {
  id: string;
  provider_type: 'payment';
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
const PAYMENT_PRESETS: Preset[] = [
  {
    key: 'razorpay',
    name: 'Razorpay',
    notes: 'Indian payment gateway. Get Key ID and Key Secret from Razorpay Dashboard → Settings → API Keys. Use test keys for sandbox.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'key_id', label: 'Key ID', placeholder: 'rzp_live_xxxxx or rzp_test_xxxxx', type: 'text', required: true },
      { key: 'key_secret', label: 'Key Secret', placeholder: 'your-key-secret', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret (optional)', placeholder: 'whsec_xxxxx', type: 'password' },
    ],
  },
  {
    key: 'cashfree',
    name: 'Cashfree',
    notes: 'Cashfree Payments. Create app in Cashfree Dashboard → Developers → API Keys. Use client_id and client_secret.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'client_id', label: 'Client ID / App ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'webhook_secret', label: 'Webhook Secret (optional)', placeholder: 'your-webhook-secret', type: 'password' },
    ],
  },
  {
    key: 'phonepe',
    name: 'PhonePe PG',
    notes: 'PhonePe Payment Gateway (Standard Checkout SDK). Get Client ID, Client Secret and Client Version from PhonePe Business Dashboard → Developer Settings. Use SANDBOX credentials for testing.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: 'your-client-id', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', required: true },
      { key: 'client_version', label: 'Client Version', placeholder: '1', type: 'text', required: true },
    ],
  },
  {
    key: 'payu',
    name: 'PayU',
    notes: 'PayU India. Get Merchant Key and Salt from PayU Dashboard → Account Settings → Merchant Key.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'merchant_key', label: 'Merchant Key', placeholder: 'your-merchant-key', type: 'text', required: true },
      { key: 'merchant_salt', label: 'Merchant Salt', placeholder: 'your-merchant-salt', type: 'password', required: true },
      { key: 'auth_header', label: 'Auth Header (optional)', placeholder: 'optional-auth-header', type: 'password' },
    ],
  },
  {
    key: 'paytm',
    name: 'Paytm PG',
    notes: 'Paytm Payment Gateway. Get MID, Merchant Key from Paytm Business Dashboard → Developer Settings.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'mid', label: 'Merchant ID (MID)', placeholder: 'your-mid', type: 'text', required: true },
      { key: 'merchant_key', label: 'Merchant Key', placeholder: 'your-merchant-key', type: 'password', required: true },
      { key: 'website', label: 'Website Name', placeholder: 'DEFAULT or WEBSTAGING', type: 'text', required: true },
      { key: 'industry_type', label: 'Industry Type', placeholder: 'Retail', type: 'text', required: true },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'WEB', type: 'text', required: true },
    ],
  },
  {
    key: 'ccavenue',
    name: 'CCAvenue',
    notes: 'CCAvenue Payment Gateway. Get Merchant ID, Access Code and Working Key from CCAvenue Dashboard.',
    environments: ['production', 'sandbox'],
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'your-merchant-id', type: 'text', required: true },
      { key: 'access_code', label: 'Access Code', placeholder: 'your-access-code', type: 'text', required: true },
      { key: 'working_key', label: 'Working Key', placeholder: 'your-working-key', type: 'password', required: true },
    ],
  },
  {
    key: 'cod',
    name: 'Cash on Delivery',
    notes: 'Allow customers to pay with cash when the order is delivered. No API keys required. You can set optional instructions shown to customers at checkout.',
    environments: ['production'],
    fields: [
      { key: 'display_label', label: 'Display Label', placeholder: 'Cash on Delivery', type: 'text', required: true },
      { key: 'instructions', label: 'Customer Instructions (optional)', placeholder: 'Please keep exact change ready. COD available for orders under ₹5000.', type: 'text' },
      { key: 'min_order_amount', label: 'Minimum Order Amount (optional)', placeholder: '0', type: 'text' },
      { key: 'max_order_amount', label: 'Maximum Order Amount (optional)', placeholder: '5000', type: 'text' },
      { key: 'extra_charge', label: 'Extra COD Charge (optional)', placeholder: '0', type: 'text' },
    ],
  },
  {
    key: 'custom_payment',
    name: 'Custom Payment',
    notes: 'Use for any other payment provider. Store all required credentials as key-value pairs.',
    environments: ['production', 'sandbox', 'testing'],
    fields: [
      { key: 'api_key', label: 'API Key / Client ID', placeholder: 'your-api-key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret / Client Secret', placeholder: 'your-api-secret', type: 'password', required: true },
      { key: 'merchant_id', label: 'Merchant ID (optional)', placeholder: 'optional-merchant-id', type: 'text' },
      { key: 'webhook_secret', label: 'Webhook Secret (optional)', placeholder: 'optional-webhook-secret', type: 'password' },
    ],
  },
];
const PaymentProvidersSetup: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPresetKey, setSelectedPresetKey] = useState('razorpay');
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
  const selectedPreset = PAYMENT_PRESETS.find((p) => p.key === selectedPresetKey) || PAYMENT_PRESETS[0];
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/providers');
      const all = res.data.data || [];
      const payment = all.filter((p: any) => p.provider_type === 'payment');
      setProviders(payment);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load payment providers');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);
  const applyPreset = (key: string) => {
    const preset = PAYMENT_PRESETS.find((p) => p.key === key) || PAYMENT_PRESETS[0];
    setSelectedPresetKey(key);
    setFormName(preset.name);
    const defaultEnv =
      preset.environments && preset.environments.includes('production')
        ? 'production'
        : preset.environments?.[0] || 'production';
    setFormEnvironment(defaultEnv);
    const creds: Record<string, string> = {};
    preset.fields.forEach((f) => {
      if (key === 'cod' && f.key === 'display_label' && !formCredentials[f.key]) {
        creds[f.key] = 'Cash on Delivery';
      } else if (key === 'phonepe' && f.key === 'client_version' && !formCredentials[f.key]) {
        creds[f.key] = '1';
      } else {
        creds[f.key] = formCredentials[f.key] || '';
      }
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
    setSelectedPresetKey('razorpay');
    setError('');
    setSuccess('');
  };
  const openAddForm = () => {
    resetForm();
    applyPreset('razorpay');
    setShowForm(true);
  };
  const openEditForm = (provider: Provider) => {
    setEditingId(provider.id);
    setFormName(provider.name);
    setFormCredentials({ ...provider.credentials });
    if (provider.credentials.environment) {
      setFormEnvironment(provider.credentials.environment);
    } else {
      const preset = PAYMENT_PRESETS.find((p) => p.key === provider.provider_key);
      if (preset && preset.environments && preset.environments.length > 0) {
        setFormEnvironment(preset.environments[0]);
      } else {
        setFormEnvironment('production');
      }
    }
    if (provider.provider_key) {
      const preset = PAYMENT_PRESETS.find((p) => p.key === provider.provider_key);
      setSelectedPresetKey(preset ? preset.key : 'custom_payment');
    } else {
      setSelectedPresetKey('custom_payment');
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
        provider_type: 'payment',
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
        setSuccess('Payment provider updated successfully');
      } else {
        await api.post('/providers', payload);
        setSuccess('Payment provider added successfully');
      }
      resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save payment provider');
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
      setError(err.response?.data?.message || 'Failed to toggle payment provider');
    }
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment provider?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/providers/${id}`);
      setSuccess('Payment provider deleted successfully');
      if (editingId === id) resetForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete payment provider');
    }
  };
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-glass p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Payment Providers Setup</h1>
            <p className="text-gray-500 text-sm mt-1">
              Add and configure payment gateways for your store (including Cash on Delivery & PhonePe). Credentials are stored securely and used when processing payments.
            </p>
          </div>
          {!showForm && (
            <button onClick={openAddForm} className="btn-primary whitespace-nowrap self-start sm:self-auto">
              + Add Payment Provider
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
              {editingId ? 'Edit Payment Provider' : 'Add New Payment Provider'}
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
                  {PAYMENT_PRESETS.map((p) => (
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
                  placeholder="e.g., PhonePe Sandbox / COD"
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
                  <div key={field.key} className={field.key === 'instructions' ? 'sm:col-span-2' : ''}>
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
              {selectedPresetKey === 'cod' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Cash on Delivery tips</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>No API keys needed – just enable the provider to show COD at checkout.</li>
                    <li>Use Min/Max order amount to restrict COD eligibility.</li>
                    <li>Extra COD charge is added to the order total when customer selects COD.</li>
                    <li>Instructions are shown to the customer on the checkout page.</li>
                  </ul>
                </div>
              )}
              {selectedPresetKey === 'phonepe' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">PhonePe setup checklist</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Use Client ID, Client Secret and Client Version from PhonePe Business Dashboard.</li>
                    <li>Start with <strong>Sandbox</strong> environment for testing.</li>
                    <li>After saving, Enable the provider so it appears on the store checkout.</li>
                    <li>Orders are created as pending and marked paid only after successful PhonePe status check.</li>
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
          <div className="text-center py-12 text-gray-500">Loading payment providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No payment providers configured yet.</p>
            {!showForm && (
              <button onClick={openAddForm} className="btn-primary">
                Add your first payment provider
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => {
              const preset = PAYMENT_PRESETS.find((p) => p.key === provider.provider_key);
              const environment = provider.credentials?.environment || 'production';
              const isCod = provider.provider_key === 'cod';
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
                      {isCod
                        ? [
                            provider.credentials?.display_label
                              ? `Label: ${provider.credentials.display_label}`
                              : null,
                            provider.credentials?.min_order_amount
                              ? `Min: ₹${provider.credentials.min_order_amount}`
                              : null,
                            provider.credentials?.max_order_amount
                              ? `Max: ₹${provider.credentials.max_order_amount}`
                              : null,
                            provider.credentials?.extra_charge
                              ? `Charge: ₹${provider.credentials.extra_charge}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' • ') || 'Cash on Delivery'
                        : Object.entries(provider.credentials)
                            .filter(
                              ([k]) =>
                                k !== 'environment' &&
                                (k.includes('key') ||
                                  k.includes('id') ||
                                  k.includes('mid') ||
                                  k.includes('merchant') ||
                                  k.includes('access') ||
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
export default PaymentProvidersSetup;
