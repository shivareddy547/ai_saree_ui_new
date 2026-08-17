import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

interface Address {
  id: number;
  fullName: string;
  streetAddress: string;
  apartment?: string | null;
  city: string;
  state?: string | null;
  zipCode?: string | null;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

interface FormData {
  country: string;
  fullName: string;
  streetAddress: string;
  apartment: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: FormData = {
  country: 'India',
  fullName: '',
  streetAddress: '',
  apartment: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  isDefault: false,
};

const StoreManageAddresses: React.FC = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Photon + Nominatim state
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetInputRef = useRef<HTMLDivElement>(null);

  const fetchAddresses = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { from: '/store/manage-addresses' } });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/addresses');
      setAddresses(res.data?.data || []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        navigate('/login', { state: { from: '/store/manage-addresses' } });
        return;
      }
      setError(err?.response?.data?.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Photon search
  const searchPhoton = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Photon search error:', err);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, streetAddress: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPhoton(value), 350);
  };

  const selectSuggestion = (feature: any) => {
    const p = feature.properties;
    const streetParts = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
    setFormData((prev) => ({
      ...prev,
      streetAddress: streetParts || p.name || prev.streetAddress,
      city: p.city || prev.city,
      state: p.state || prev.state,
      zipCode: p.postcode || prev.zipCode,
      country: p.country || prev.country,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getSuggestionLabel = (feature: any) => {
    const p = feature.properties;
    const parts = [
      [p.housenumber, p.street || p.name].filter(Boolean).join(' '),
      p.city,
      p.state,
      p.postcode,
      p.country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Nominatim reverse geocode
  const getAddressFromNominatim = async (lat: number, lng: number) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
    );
    if (!response.ok) throw new Error('Nominatim request failed');
    return await response.json();
  };

  /**
   * Robust address extractor that works with Indian + international Nominatim responses.
   * Handles missing city / house_number by falling back to neighbourhood, county, etc.
   */
  const extractAddressFromNominatim = (data: any) => {
    if (!data) throw new Error('No address found');

    const addr = data.address || {};

    // --- Street address ---
    // Prefer house_number + road. Fall back to name / first part of display_name
    const streetParts = [
      addr.house_number,
      addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.residential,
    ].filter(Boolean);

    let streetAddress = streetParts.join(' ').trim();
    if (!streetAddress) {
      // Use the "name" field (often the road name) or first segment of display_name
      streetAddress = data.name || (data.display_name ? data.display_name.split(',')[0].trim() : '');
    }

    // --- Apartment / locality (neighbourhood, suburb, residential area) ---
    const apartment =
      addr.neighbourhood ||
      addr.suburb ||
      addr.residential ||
      addr.quarter ||
      addr.city_district ||
      '';

    // --- City ---
    // Many Indian responses put the area in neighbourhood/county instead of city
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.county ||
      addr.city_district ||
      '';

    // --- State ---
    const state =
      addr.state ||
      addr.state_district ||
      addr.region ||
      addr.county ||
      '';

    // --- Postcode & Country ---
    const zipCode = addr.postcode || '';
    const country = addr.country || '';

    return {
      streetAddress,
      apartment,
      city,
      state,
      zipCode,
      country,
      formattedAddress: data.display_name || `${streetAddress}, ${city}, ${state}`,
    };
  };

  const handleAutofillLocation = () => {
    if (!window.isSecureContext) {
      setLocationError(
        'Location access requires HTTPS or localhost. Please open the site via https:// or http://localhost'
      );
      setLocationSuccess(false);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationSuccess(false);
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const data = await getAddressFromNominatim(latitude, longitude);
          const address = extractAddressFromNominatim(data);

          setFormData((prev) => ({
            ...prev,
            streetAddress: address.streetAddress || prev.streetAddress,
            apartment: address.apartment || prev.apartment,
            city: address.city || prev.city,
            state: address.state || prev.state,
            zipCode: address.zipCode || prev.zipCode,
            country: address.country || prev.country,
          }));

          setLocationError(null);
          setLocationSuccess(true);
          setTimeout(() => setLocationSuccess(false), 4000);
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          setLocationError(
            'Got your location but failed to convert it to an address. Please enter it manually.'
          );
          setLocationSuccess(false);
        } finally {
          setIsLocating(false);
        }
      },
      (error: GeolocationPositionError) => {
        console.error('Geolocation error:', error);
        let message = 'Unable to retrieve your location. ';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message +=
              'Location permission is blocked. Click the lock icon in the address bar → Site settings → Location → Allow, then reload.';
            break;
          case error.POSITION_UNAVAILABLE:
            message +=
              'Location is currently unavailable. Please try again or enter the address manually.';
            break;
          case error.TIMEOUT:
            message +=
              'Location request timed out. Please try again or enter the address manually.';
            break;
          default:
            message += 'Please enter your address manually.';
        }

        setLocationError(message);
        setLocationSuccess(false);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        streetInputRef.current &&
        !streetInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setLocationError(null);
    setLocationSuccess(false);
    setShowForm(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingId(addr.id);
    setFormData({
      country: addr.country || 'India',
      fullName: addr.fullName || '',
      streetAddress: addr.streetAddress || '',
      apartment: addr.apartment || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      phone: addr.phone || '',
      isDefault: !!addr.isDefault,
    });
    setLocationError(null);
    setLocationSuccess(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setSuggestions([]);
    setShowSuggestions(false);
    setLocationError(null);
    setLocationSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.fullName.trim() ||
      !formData.streetAddress.trim() ||
      !formData.city.trim() ||
      !formData.country.trim()
    ) {
      setError('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await apiClient.put(`/addresses/${editingId}`, formData);
        setSuccessMsg('Address updated successfully');
      } else {
        await apiClient.post('/addresses', formData);
        setSuccessMsg('Address added successfully');
      }
      closeForm();
      await fetchAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to save address'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    setDeletingId(id);
    setError(null);
    try {
      await apiClient.delete(`/addresses/${id}`);
      setSuccessMsg('Address deleted successfully');
      await fetchAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: number) => {
    setError(null);
    try {
      await apiClient.patch(`/addresses/${id}/default`, {});
      setSuccessMsg('Default address updated');
      await fetchAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to set default address');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Manage Addresses
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Add, edit or remove your delivery addresses
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Address
        </button>
      </div>

      {/* Success / Error toasts */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && !showForm && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Address list */}
      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No addresses yet
          </h2>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Add your first delivery address to make checkout faster.
          </p>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                addr.isDefault
                  ? 'border-purple-300 ring-1 ring-purple-100'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {addr.fullName}
                    </h3>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        <Home className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {addr.streetAddress}
                    {addr.apartment ? `, ${addr.apartment}` : ''}
                    <br />
                    {addr.city}
                    {addr.state ? `, ${addr.state}` : ''}
                    {addr.zipCode ? ` - ${addr.zipCode}` : ''}
                    <br />
                    {addr.country}
                    {addr.phone ? (
                      <>
                        <br />
                        Phone: {addr.phone}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-xs font-medium text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-full border border-purple-200 hover:bg-purple-50 transition"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => openEditForm(addr)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={deletingId === addr.id}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === addr.id ? (
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

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeForm}
          />
          <div className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit address' : 'Add a new address'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Autofill banner */}
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg px-4 py-3 mb-5 ${
                  locationError
                    ? 'bg-red-50 border border-red-200'
                    : locationSuccess
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {locationError
                      ? '📍 Location Error'
                      : locationSuccess
                      ? '✅ Location found!'
                      : '📍 Autofill with OpenStreetMap'}
                  </p>
                  {locationError ? (
                    <p className="text-xs text-red-600 whitespace-pre-line mt-1">
                      {locationError}
                    </p>
                  ) : locationSuccess ? (
                    <p className="text-xs text-green-700 mt-1">
                      Address fields have been auto-filled successfully.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600">
                      Free and accurate address detection using OpenStreetMap.
                      Works on HTTPS or localhost.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAutofillLocation}
                  disabled={isLocating}
                  className={`text-sm font-medium px-4 py-1.5 rounded-full transition disabled:opacity-60 shrink-0 ${
                    locationError
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : locationSuccess
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {isLocating ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      Locating...
                    </span>
                  ) : locationSuccess ? (
                    'Done'
                  ) : (
                    '📍 Autofill'
                  )}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Country/Region
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
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
                    Full name (First and Last name)
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="John Doe"
                  />
                </div>

                <div className="relative" ref={streetInputRef}>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Street address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="streetAddress"
                      value={formData.streetAddress}
                      onChange={handleStreetChange}
                      onFocus={() =>
                        suggestions.length > 0 && setShowSuggestions(true)
                      }
                      required
                      placeholder="Street address, P.O. box, company name, c/o"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                      autoComplete="off"
                    />
                    {isLoadingSuggestions && (
                      <div className="absolute right-3 top-2.5">
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {suggestions.map((feature, idx) => (
                        <li
                          key={idx}
                          onClick={() => selectSuggestion(feature)}
                          className="px-3 py-2.5 text-sm cursor-pointer hover:bg-purple-50 border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">
                            {getSuggestionLabel(feature)}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {feature.properties.osm_value ||
                              feature.properties.type}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleChange}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 mt-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
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
                    value={formData.state}
                    onChange={handleChange}
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
                    value={formData.zipCode}
                    onChange={handleChange}
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
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="(555) 555-5555"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    May be used to assist delivery
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    name="isDefault"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-800">
                    Use as my default address.
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-full font-medium text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? (
                      'Update address'
                    ) : (
                      'Add address'
                    )}
                  </button>
                </div>
              </form>

              <p className="text-xs text-gray-400 mt-6 text-center">
                Address search powered by{' '}
                <a
                  href="https://photon.komoot.io"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Photon
                </a>{' '}
                + OpenStreetMap • Location by{' '}
                <a
                  href="https://nominatim.openstreetmap.org"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Nominatim
                </a>{' '}
                (OpenStreetMap)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManageAddresses;
