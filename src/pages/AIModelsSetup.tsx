import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Cpu, Plus, RefreshCw, Zap, Settings, Trash2, Eye } from 'lucide-react';
interface AiProvider {
  id: string;
  name: string;
  provider: string;
  api_key?: string | null;
  api_secret?: string | null;
  has_api_key?: boolean;
  has_api_secret?: boolean;
  endpoint?: string | null;
  organization_id?: string | null;
  project_id?: string | null;
  region?: string | null;
  enabled: boolean;
  default_provider: boolean;
  timeout: number;
  max_retries: number;
  metadata?: Record<string, any>;
  models?: AiModel[];
  createdAt?: string;
  updatedAt?: string;
}
interface AiModel {
  id: string;
  ai_provider_id: string;
  name: string;
  model_identifier: string;
  model_type: string;
  context_window?: number | null;
  max_output_tokens?: number | null;
  supports_streaming: boolean;
  supports_function_calling: boolean;
  supports_json_mode: boolean;
  supports_vision: boolean;
  enabled: boolean;
  is_default: boolean;
  metadata?: Record<string, any>;
  provider?: { id: string; name: string; provider: string; enabled: boolean };
  createdAt?: string;
  updatedAt?: string;
}
const PROVIDER_OPTIONS = [
  { key: 'openai', name: 'OpenAI' },
  { key: 'anthropic', name: 'Anthropic' },
  { key: 'gemini', name: 'Google Gemini' },
  { key: 'azure_openai', name: 'Azure OpenAI' },
  { key: 'ollama', name: 'Ollama' },
  { key: 'groq', name: 'Groq' },
  { key: 'mistral', name: 'Mistral' },
  { key: 'bedrock', name: 'AWS Bedrock' },
];
const MODEL_TYPES = ['chat', 'embedding', 'image', 'audio', 'moderation'];
const AIModelsSetup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'providers' | 'models'>('providers');
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [filterProviderId, setFilterProviderId] = useState<string>('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pForm, setPForm] = useState({
    name: '',
    provider: 'openai',
    api_key: '',
    api_secret: '',
    endpoint: '',
    organization_id: '',
    project_id: '',
    region: '',
    timeout: 60,
    max_retries: 3,
    enabled: true,
    default_provider: false,
  });
  const [mForm, setMForm] = useState({
    ai_provider_id: '',
    name: '',
    model_identifier: '',
    model_type: 'chat',
    context_window: '',
    max_output_tokens: '',
    supports_streaming: false,
    supports_function_calling: false,
    supports_json_mode: false,
    supports_vision: false,
    enabled: true,
    is_default: false,
  });
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true,
  });
  const fetchProviders = useCallback(async () => {
    try {
      const res = await api.get('/ai-providers');
      setProviders(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load AI providers');
    }
  }, []);
  const fetchModels = useCallback(async (providerId?: string) => {
    try {
      const url = providerId ? `/ai-models?provider_id=${providerId}` : '/ai-models';
      const res = await api.get(url);
      setModels(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load AI models');
    }
  }, []);
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([fetchProviders(), fetchModels(filterProviderId || undefined)]);
    } finally {
      setLoading(false);
    }
  }, [fetchProviders, fetchModels, filterProviderId]);
  useEffect(() => {
    loadAll();
  }, [loadAll]);
  const resetProviderForm = () => {
    setPForm({
      name: '',
      provider: 'openai',
      api_key: '',
      api_secret: '',
      endpoint: '',
      organization_id: '',
      project_id: '',
      region: '',
      timeout: 60,
      max_retries: 3,
      enabled: true,
      default_provider: false,
    });
    setEditingProviderId(null);
    setShowProviderForm(false);
  };
  const resetModelForm = () => {
    setMForm({
      ai_provider_id: providers[0]?.id || '',
      name: '',
      model_identifier: '',
      model_type: 'chat',
      context_window: '',
      max_output_tokens: '',
      supports_streaming: false,
      supports_function_calling: false,
      supports_json_mode: false,
      supports_vision: false,
      enabled: true,
      is_default: false,
    });
    setEditingModelId(null);
    setShowModelForm(false);
  };
  const openAddProvider = () => {
    resetProviderForm();
    setShowProviderForm(true);
    setError('');
    setSuccess('');
  };
  const openEditProvider = (p: AiProvider) => {
    setEditingProviderId(p.id);
    setPForm({
      name: p.name,
      provider: p.provider,
      api_key: '',
      api_secret: '',
      endpoint: p.endpoint || '',
      organization_id: p.organization_id || '',
      project_id: p.project_id || '',
      region: p.region || '',
      timeout: p.timeout ?? 60,
      max_retries: p.max_retries ?? 3,
      enabled: p.enabled,
      default_provider: p.default_provider,
    });
    setShowProviderForm(true);
    setError('');
    setSuccess('');
  };
  const openAddModel = (providerId?: string) => {
    resetModelForm();
    setMForm((prev) => ({
      ...prev,
      ai_provider_id: providerId || providers[0]?.id || '',
    }));
    setShowModelForm(true);
    setActiveTab('models');
    setError('');
    setSuccess('');
  };
  const openEditModel = (m: AiModel) => {
    setEditingModelId(m.id);
    setMForm({
      ai_provider_id: m.ai_provider_id,
      name: m.name,
      model_identifier: m.model_identifier,
      model_type: m.model_type,
      context_window: m.context_window != null ? String(m.context_window) : '',
      max_output_tokens: m.max_output_tokens != null ? String(m.max_output_tokens) : '',
      supports_streaming: m.supports_streaming,
      supports_function_calling: m.supports_function_calling,
      supports_json_mode: m.supports_json_mode,
      supports_vision: m.supports_vision,
      enabled: m.enabled,
      is_default: m.is_default,
    });
    setShowModelForm(true);
    setActiveTab('models');
    setError('');
    setSuccess('');
  };
  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pForm.name.trim()) {
      setError('Provider name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        name: pForm.name.trim(),
        provider: pForm.provider,
        endpoint: pForm.endpoint || null,
        organization_id: pForm.organization_id || null,
        project_id: pForm.project_id || null,
        region: pForm.region || null,
        timeout: Number(pForm.timeout) || 60,
        max_retries: Number(pForm.max_retries) || 3,
        enabled: pForm.enabled,
        default_provider: pForm.default_provider,
      };
      if (pForm.api_key) payload.api_key = pForm.api_key;
      if (pForm.api_secret) payload.api_secret = pForm.api_secret;
      if (editingProviderId) {
        await api.put(`/ai-providers/${editingProviderId}`, payload);
        setSuccess('AI provider updated successfully');
      } else {
        await api.post('/ai-providers', payload);
        setSuccess('AI provider added successfully');
      }
      resetProviderForm();
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save AI provider');
    } finally {
      setSaving(false);
    }
  };
  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mForm.name.trim() || !mForm.model_identifier.trim() || !mForm.ai_provider_id) {
      setError('Name, model identifier and provider are required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        ai_provider_id: mForm.ai_provider_id,
        name: mForm.name.trim(),
        model_identifier: mForm.model_identifier.trim(),
        model_type: mForm.model_type,
        context_window: mForm.context_window ? Number(mForm.context_window) : null,
        max_output_tokens: mForm.max_output_tokens ? Number(mForm.max_output_tokens) : null,
        supports_streaming: mForm.supports_streaming,
        supports_function_calling: mForm.supports_function_calling,
        supports_json_mode: mForm.supports_json_mode,
        supports_vision: mForm.supports_vision,
        enabled: mForm.enabled,
        is_default: mForm.is_default,
      };
      if (editingModelId) {
        await api.put(`/ai-models/${editingModelId}`, payload);
        setSuccess('AI model updated successfully');
      } else {
        await api.post('/ai-models', payload);
        setSuccess('AI model added successfully');
      }
      resetModelForm();
      await fetchModels(filterProviderId || undefined);
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save AI model');
    } finally {
      setSaving(false);
    }
  };
  const handleToggleProvider = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/ai-providers/${id}/toggle`);
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle provider');
    }
  };
  const handleSetDefaultProvider = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/ai-providers/${id}/set-default`);
      setSuccess('Default provider updated');
      await fetchProviders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set default provider');
    }
  };
  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/ai-providers/${id}/test-connection`);
      const result = res.data.data;
      if (result?.success) {
        setSuccess(result.message || 'Connection successful');
      } else {
        setError(result?.message || 'Connection test failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  };
  const handleDeleteProvider = async (id: string) => {
    if (!window.confirm('Delete this AI provider and all its models?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/ai-providers/${id}`);
      setSuccess('AI provider deleted');
      if (editingProviderId === id) resetProviderForm();
      await loadAll();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete provider');
    }
  };
  const handleToggleModel = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/ai-models/${id}/toggle`);
      await fetchModels(filterProviderId || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle model');
    }
  };
  const handleSetDefaultModel = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/ai-models/${id}/set-default`);
      setSuccess('Default model updated');
      await fetchModels(filterProviderId || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set default model');
    }
  };
  const handleDeleteModel = async (id: string) => {
    if (!window.confirm('Delete this AI model?')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/ai-models/${id}`);
      setSuccess('AI model deleted');
      if (editingModelId === id) resetModelForm();
      await fetchModels(filterProviderId || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete model');
    }
  };
  const providerLabel = (key: string) =>
    PROVIDER_OPTIONS.find((p) => p.key === key)?.name || key;
  return (
    <div className="space-y-5 sm:space-y-8 px-1 sm:px-0 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">AI Models Setup</h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure AI providers and models for video generation, chat, embeddings and more.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadAll()}
            className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {activeTab === 'providers' && !showProviderForm && (
            <button onClick={openAddProvider} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Provider
            </button>
          )}
          {activeTab === 'models' && !showModelForm && (
            <button onClick={() => openAddModel()} className="btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Model
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm">{success}</div>
      )}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'providers'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          AI Providers ({providers.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('models')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'models'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          AI Models ({models.length})
        </button>
      </div>
      {activeTab === 'providers' && (
        <div className="card-glass p-4 sm:p-6">
          {showProviderForm && (
            <div className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {editingProviderId ? 'Edit AI Provider' : 'Add New AI Provider'}
              </h2>
              <form onSubmit={handleProviderSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pForm.name}
                      onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g. OpenAI Production"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pForm.provider}
                      onChange={(e) => setPForm({ ...pForm, provider: e.target.value })}
                      className="input-field"
                      disabled={saving || !!editingProviderId}
                    >
                      {PROVIDER_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <input
                      type="password"
                      value={pForm.api_key}
                      onChange={(e) => setPForm({ ...pForm, api_key: e.target.value })}
                      className="input-field"
                      placeholder={editingProviderId ? 'Leave blank to keep existing' : 'sk-...'}
                      disabled={saving}
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                    <input
                      type="password"
                      value={pForm.api_secret}
                      onChange={(e) => setPForm({ ...pForm, api_secret: e.target.value })}
                      className="input-field"
                      placeholder={editingProviderId ? 'Leave blank to keep existing' : 'Optional'}
                      disabled={saving}
                      autoComplete="off"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                    <input
                      type="text"
                      value={pForm.endpoint}
                      onChange={(e) => setPForm({ ...pForm, endpoint: e.target.value })}
                      className="input-field"
                      placeholder="https://api.openai.com/v1"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
                    <input
                      type="text"
                      value={pForm.organization_id}
                      onChange={(e) => setPForm({ ...pForm, organization_id: e.target.value })}
                      className="input-field"
                      placeholder="Optional"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                    <input
                      type="text"
                      value={pForm.project_id}
                      onChange={(e) => setPForm({ ...pForm, project_id: e.target.value })}
                      className="input-field"
                      placeholder="Optional"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <input
                      type="text"
                      value={pForm.region}
                      onChange={(e) => setPForm({ ...pForm, region: e.target.value })}
                      className="input-field"
                      placeholder="e.g. us-east-1"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (sec)</label>
                    <input
                      type="number"
                      value={pForm.timeout}
                      onChange={(e) => setPForm({ ...pForm, timeout: Number(e.target.value) })}
                      className="input-field"
                      min={1}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
                    <input
                      type="number"
                      value={pForm.max_retries}
                      onChange={(e) => setPForm({ ...pForm, max_retries: Number(e.target.value) })}
                      className="input-field"
                      min={0}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={pForm.enabled}
                      onChange={(e) => setPForm({ ...pForm, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Enabled
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={pForm.default_provider}
                      onChange={(e) => setPForm({ ...pForm, default_provider: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Default Provider
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingProviderId ? 'Update Provider' : 'Add Provider'}
                  </button>
                  <button
                    type="button"
                    onClick={resetProviderForm}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading AI providers...</div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-gray-500 mb-4">No AI providers configured yet.</p>
              {!showProviderForm && (
                <button onClick={openAddProvider} className="btn-primary">
                  Add your first AI provider
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 px-2 font-medium">Name</th>
                    <th className="py-3 px-2 font-medium">Provider</th>
                    <th className="py-3 px-2 font-medium hidden md:table-cell">Endpoint</th>
                    <th className="py-3 px-2 font-medium">Enabled</th>
                    <th className="py-3 px-2 font-medium">Default</th>
                    <th className="py-3 px-2 font-medium hidden lg:table-cell">Created</th>
                    <th className="py-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-800">{p.name}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {providerLabel(p.provider)}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 truncate max-w-[180px] hidden md:table-cell">
                        {p.endpoint || '—'}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {p.enabled ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {p.default_provider ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Default
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-500 hidden lg:table-cell">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditProvider(p)}
                            className="px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100"
                            title="Edit"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestConnection(p.id)}
                            disabled={testingId === p.id}
                            className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            title="Test Connection"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleProvider(p.id)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              p.enabled
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {p.enabled ? 'Disable' : 'Enable'}
                          </button>
                          {!p.default_provider && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultProvider(p.id)}
                              className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFilterProviderId(p.id);
                              setActiveTab('models');
                            }}
                            className="px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            title="View Models"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProvider(p.id)}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab === 'models' && (
        <div className="card-glass p-4 sm:p-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="text-sm font-medium text-gray-700">Filter by provider:</label>
            <select
              value={filterProviderId}
              onChange={(e) => setFilterProviderId(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {showModelForm && (
            <div className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {editingModelId ? 'Edit AI Model' : 'Add New AI Model'}
              </h2>
              <form onSubmit={handleModelSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provider <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mForm.ai_provider_id}
                      onChange={(e) => setMForm({ ...mForm, ai_provider_id: e.target.value })}
                      className="input-field"
                      required
                      disabled={saving}
                    >
                      <option value="">Select provider</option>
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({providerLabel(p.provider)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={mForm.name}
                      onChange={(e) => setMForm({ ...mForm, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g. GPT-5.5"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Identifier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={mForm.model_identifier}
                      onChange={(e) => setMForm({ ...mForm, model_identifier: e.target.value })}
                      className="input-field"
                      placeholder="e.g. gpt-5.5"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mForm.model_type}
                      onChange={(e) => setMForm({ ...mForm, model_type: e.target.value })}
                      className="input-field"
                      disabled={saving}
                    >
                      {MODEL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Context Window</label>
                    <input
                      type="number"
                      value={mForm.context_window}
                      onChange={(e) => setMForm({ ...mForm, context_window: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 128000"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Output Tokens</label>
                    <input
                      type="number"
                      value={mForm.max_output_tokens}
                      onChange={(e) => setMForm({ ...mForm, max_output_tokens: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 16384"
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-1">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={mForm.supports_streaming}
                      onChange={(e) => setMForm({ ...mForm, supports_streaming: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Streaming
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={mForm.supports_function_calling}
                      onChange={(e) =>
                        setMForm({ ...mForm, supports_function_calling: e.target.checked })
                      }
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Function Calling
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={mForm.supports_json_mode}
                      onChange={(e) => setMForm({ ...mForm, supports_json_mode: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    JSON Mode
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={mForm.supports_vision}
                      onChange={(e) => setMForm({ ...mForm, supports_vision: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Vision
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={mForm.enabled}
                      onChange={(e) => setMForm({ ...mForm, enabled: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Enabled
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={mForm.is_default}
                      onChange={(e) => setMForm({ ...mForm, is_default: e.target.checked })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={saving}
                    />
                    Default for Provider
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingModelId ? 'Update Model' : 'Add Model'}
                  </button>
                  <button
                    type="button"
                    onClick={resetModelForm}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading AI models...</div>
          ) : models.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No AI models configured yet.</p>
              {!showModelForm && providers.length > 0 && (
                <button onClick={() => openAddModel()} className="btn-primary">
                  Add your first AI model
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 px-2 font-medium">Provider</th>
                    <th className="py-3 px-2 font-medium">Name</th>
                    <th className="py-3 px-2 font-medium">Identifier</th>
                    <th className="py-3 px-2 font-medium">Type</th>
                    <th className="py-3 px-2 font-medium hidden md:table-cell">Vision</th>
                    <th className="py-3 px-2 font-medium hidden md:table-cell">Streaming</th>
                    <th className="py-3 px-2 font-medium hidden lg:table-cell">JSON</th>
                    <th className="py-3 px-2 font-medium">Enabled</th>
                    <th className="py-3 px-2 font-medium">Default</th>
                    <th className="py-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-700">
                        {m.provider?.name || '—'}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-800">{m.name}</td>
                      <td className="py-3 px-2 text-gray-600 font-mono text-xs">{m.model_identifier}</td>
                      <td className="py-3 px-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {m.model_type}
                        </span>
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">{m.supports_vision ? '✓' : '—'}</td>
                      <td className="py-3 px-2 hidden md:table-cell">{m.supports_streaming ? '✓' : '—'}</td>
                      <td className="py-3 px-2 hidden lg:table-cell">{m.supports_json_mode ? '✓' : '—'}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {m.enabled ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {m.is_default ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Default
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditModel(m)}
                            className="px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleModel(m.id)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              m.enabled
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {m.enabled ? 'Disable' : 'Enable'}
                          </button>
                          {!m.is_default && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultModel(m.id)}
                              className="px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteModel(m.id)}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default AIModelsSetup;
