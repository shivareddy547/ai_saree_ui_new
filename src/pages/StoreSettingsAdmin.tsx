import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  CheckCircle2,
  Home,
  Power,
} from 'lucide-react';
interface StoreSettings {
  id: string;
  name: string;
  caption: string | null;
  logo: string | null;
  favicon: string | null;
  createdAt?: string;
  updatedAt?: string;
}
interface PickupLocation {
  id: number;
  name: string;
  streetAddress: string;
  apartment?: string | null;
  city: string;
  state?: string | null;
  zipCode?: string | null;
  country: string;
  phone?: string | null;
  isActive: boolean;
  isDefault: boolean;
}
interface PickupFormData {
  name: string;
  streetAddress: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isActive: boolean;
  isDefault: boolean;
}
const emptyPickupForm: PickupFormData = {
  name: '',
  streetAddress: '',
  apartment: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'India',
  phone: '',
  isActive: true,
  isDefault: false,
};
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
  // Pickup locations state
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [pickupSuccess, setPickupSuccess] = useState<string | null>(null);
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [editingPickupId, setEditingPickupId] = useState<number | null>(null);
  const [pickupForm, setPickupForm] = useState<PickupFormData>(emptyPickupForm);
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [deletingPickupId, setDeletingPickupId] = useState<number | null>(null);
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
  const fetchPickupLocations = useCallback(async () => {
    setPickupLoading(true);
    setPickupError(null);
    try {
      const res = await api.get('/pickup-locations');
      setPickupLocations(res.data?.data || []);
    } catch (err: any) {
      setPickupError(err.response?.data?.message || 'Failed to load pickup locations');
    } finally {
      setPickupLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchSettings();
    fetchPickupLocations();
  }, [fetchSettings, fetchPickupLocations]);
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
  // Pickup location handlers
  const openAddPickupForm = () => {
    setEditingPickupId(null);
    setPickupForm(emptyPickupForm);
    setPickupError(null);
    setShowPickupForm(true);
  };
  const openEditPickupForm = (loc: PickupLocation) => {
    setEditingPickupId(loc.id);
    setPickupForm({
      name: loc.name || '',
      streetAddress: loc.streetAddress || '',
      apartment: loc.apartment || '',
      city: loc.city || '',
      state: loc.state || '',
      zipCode: loc.zipCode || '',
      country: loc.country || 'India',
      phone: loc.phone || '',
      isActive: !!loc.isActive,
      isDefault: !!loc.isDefault,
    });
    setPickupError(null);
    setShowPickupForm(true);
  };
  const closePickupForm = () => {
    setShowPickupForm(false);
    setEditingPickupId(null);
    setPickupForm(emptyPickupForm);
    setPickupError(null);
  };
  const handlePickupFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setPickupForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  const handlePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !pickupForm.name.trim() ||
      !pickupForm.streetAddress.trim() ||
      !pickupForm.city.trim()
    ) {
      setPickupError('Please fill in all required fields (Name, Street address, City)');
      return;
    }
    setPickupSubmitting(true);
    setPickupError(null);
    try {
      if (editingPickupId) {
        await api.put(`/pickup-locations/${editingPickupId}`, pickupForm);
        setPickupSuccess('Pickup location updated successfully');
      } else {
        await api.post('/pickup-locations', pickupForm);
        setPickupSuccess('Pickup location added successfully');
      }
      closePickupForm();
      await fetchPickupLocations();
      setTimeout(() => setPickupSuccess(null), 3000);
    } catch (err: any) {
      setPickupError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to save pickup location'
      );
    } finally {
      setPickupSubmitting(false);
    }
  };
  const handleDeletePickup = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this pickup location?')) return;
    setDeletingPickupId(id);
    setPickupError(null);
    try {
      await api.delete(`/pickup-locations/${id}`);
      setPickupSuccess('Pickup location deleted successfully');
      await fetchPickupLocations();
      setTimeout(() => setPickupSuccess(null), 3000);
    } catch (err: any) {
      setPickupError(err?.response?.data?.message || 'Failed to delete pickup location');
    } finally {
      setDeletingPickupId(null);
    }
  };
  const handleSetDefaultPickup = async (id: number) => {
    setPickupError(null);
    try {
      await api.patch(`/pickup-locations/${id}/default`, {});
      setPickupSuccess('Default pickup location updated');
      await fetchPickupLocations();
      setTimeout(() => setPickupSuccess(null), 3000);
    } catch (err: any) {
      setPickupError(err?.response?.data?.message || 'Failed to set default pickup location');
    }
  };
  const handleToggleActivePickup = async (id: number, currentActive: boolean) => {
    setPickupError(null);
    try {
      await api.patch(`/pickup-locations/${id}/active`, { isActive: !currentActive });
      setPickupSuccess(
        !currentActive ? 'Pickup location activated' : 'Pickup location deactivated'
      );
      await fetchPickupLocations();
      setTimeout(() => setPickupSuccess(null), 3000);
    } catch (err: any) {
      setPickupError(err?.response?.data?.message || 'Failed to update pickup location status');
    }
  };
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Store Settings Card */}
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
      {/* Pickup Locations Card */}
      <div className="card-glass p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Pickup Locations</h2>
            <p className="text-gray-500 text-sm mt-1">
              Manage store pickup points. Create locations, set active status and default.
            </p>
          </div>
          <button
            onClick={openAddPickupForm}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Pickup Location
          </button>
        </div>
        {pickupSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {pickupSuccess}
          </div>
        )}
        {pickupError && !showPickupForm && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {pickupError}
          </div>
        )}
        {pickupLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : pickupLocations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pickup locations yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-4 text-sm">
              Add your first pickup location so customers can collect orders in-store.
            </p>
            <button
              onClick={openAddPickupForm}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Pickup Location
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pickupLocations.map((loc) => (
              <div
                key={loc.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                  loc.isDefault
                    ? 'border-purple-300 ring-1 ring-purple-100'
                    : 'border-gray-100'
                } ${!loc.isActive ? 'opacity-70' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                      {loc.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          <Home className="w-3 h-3" />
                          Default
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          loc.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {loc.streetAddress}
                      {loc.apartment ? `, ${loc.apartment}` : ''}
                      <br />
                      {loc.city}
                      {loc.state ? `, ${loc.state}` : ''}
                      {loc.zipCode ? ` - ${loc.zipCode}` : ''}
                      <br />
                      {loc.country}
                      {loc.phone ? (
                        <>
                          <br />
                          Phone: {loc.phone}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {!loc.isDefault && (
                      <button
                        onClick={() => handleSetDefaultPickup(loc.id)}
                        className="text-xs font-medium text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-full border border-purple-200 hover:bg-purple-50 transition"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActivePickup(loc.id, loc.isActive)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                        loc.isActive
                          ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                          : 'text-green-700 border-green-200 hover:bg-green-50'
                      }`}
                      title={loc.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Power className="w-3 h-3" />
                        {loc.isActive ? 'Deactivate' : 'Activate'}
                      </span>
                    </button>
                    <button
                      onClick={() => openEditPickupForm(loc)}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePickup(loc.id)}
                      disabled={deletingPickupId === loc.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingPickupId === loc.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Pickup Form Modal */}
      {showPickupForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closePickupForm}
          />
          <div className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPickupId ? 'Edit pickup location' : 'Add pickup location'}
              </h2>
              <button
                onClick={closePickupForm}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 sm:p-6">
              {pickupError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {pickupError}
                </div>
              )}
              <form onSubmit={handlePickupSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Location Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={pickupForm.name}
                    onChange={handlePickupFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="e.g. Main Warehouse, Downtown Store"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Country/Region
                  </label>
                  <select
                    name="country"
                    value={pickupForm.country}
                    onChange={handlePickupFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Street address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={pickupForm.streetAddress}
                    onChange={handlePickupFormChange}
                    required
                    placeholder="Street address, P.O. box, company name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                  <input
                    type="text"
                    name="apartment"
                    value={pickupForm.apartment}
                    onChange={handlePickupFormChange}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 mt-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={pickupForm.city}
                    onChange={handlePickupFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    State / Province / Region
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={pickupForm.state}
                    onChange={handlePickupFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={pickupForm.zipCode}
                    onChange={handlePickupFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={pickupForm.phone}
                    onChange={handlePickupFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive"
                      checked={pickupForm.isActive}
                      onChange={handlePickupFormChange}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-800">
                      Active (available for pickup)
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isDefault"
                      id="isDefault"
                      checked={pickupForm.isDefault}
                      onChange={handlePickupFormChange}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isDefault" className="text-sm text-gray-800">
                      Set as default pickup location
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closePickupForm}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-full font-medium text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pickupSubmitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {pickupSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingPickupId ? (
                      'Update location'
                    ) : (
                      'Add location'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StoreSettingsAdmin;
