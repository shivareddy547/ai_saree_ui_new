import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
interface StoreSettings {
  id: string;
  name: string;
  caption: string | null;
  logo: string | null;
  favicon: string | null;
  createdAt?: string;
  updatedAt?: string;
}
const StoreSettingsAdmin: React.FC = () => {
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formName, setFormName] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const uploadsBase = apiBase.replace(/\/api$/, '');
  const api = axios.create({
    baseURL: apiBase,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
    },
    withCredentials: true,
  });
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${uploadsBase}${path}`;
  };
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/store-settings');
      const data = res.data.data;
      setStore(data);
      setFormName(data?.name || '');
      setFormCaption(data?.caption || '');
      setLogoPreview(getImageUrl(data?.logo));
      setFaviconPreview(getImageUrl(data?.favicon));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };
  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Store name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('name', formName.trim());
      formData.append('caption', formCaption.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (faviconFile) {
        formData.append('favicon', faviconFile);
      }
      const res = await api.put('/store-settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data.data;
      setStore(data);
      setFormName(data?.name || '');
      setFormCaption(data?.caption || '');
      setLogoPreview(getImageUrl(data?.logo));
      setFaviconPreview(getImageUrl(data?.favicon));
      setLogoFile(null);
      setFaviconFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';
      setSuccess('Store settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };
  const handleReset = () => {
    if (store) {
      setFormName(store.name || '');
      setFormCaption(store.caption || '');
      setLogoPreview(getImageUrl(store.logo));
      setFaviconPreview(getImageUrl(store.favicon));
      setLogoFile(null);
      setFaviconFile(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      if (faviconInputRef.current) faviconInputRef.current.value = '';
    }
    setError('');
    setSuccess('');
  };
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card-glass p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Store Settings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Configure your store name, caption, logo and favicon
            </p>
          </div>
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
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading store settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="input-field"
                placeholder="e.g. AI Saree"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caption
              </label>
              <input
                type="text"
                value={formCaption}
                onChange={(e) => setFormCaption(e.target.value)}
                className="input-field"
                placeholder="e.g. Premium Handwoven Sarees"
                disabled={saving}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo
                </label>
                <div className="flex flex-col gap-3">
                  {logoPreview && (
                    <div className="w-32 h-32 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500">Recommended: PNG or SVG, max 5MB</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FavIcon
                </label>
                <div className="flex flex-col gap-3">
                  {faviconPreview && (
                    <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={faviconPreview}
                        alt="Favicon preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                    onChange={handleFaviconChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500">Recommended: ICO or PNG 32x32, max 5MB</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                disabled={saving}
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default StoreSettingsAdmin;
