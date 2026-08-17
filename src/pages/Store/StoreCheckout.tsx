import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import axios from 'axios';
import {
  CheckCircle,
  ArrowRight,
  Shield,
  Truck,
  CreditCard,
  ShoppingBag,
  MapPin,
  Plus,
  Loader2,
  X,
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

interface AddressFormData {
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

const emptyAddressForm: AddressFormData = {
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

const formatAddress = (addr: Address): string => {
  const lines = [
    addr.fullName,
    [addr.streetAddress, addr.apartment].filter(Boolean).join(', '),
    [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', '),
    addr.country,
    addr.phone ? `Phone: ${addr.phone}` : null,
  ].filter(Boolean);
  return lines.join('\n');
};

const StoreCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, fetchCart, mergeGuestCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  const [selectedBillingId, setSelectedBillingId] = useState<number | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);

  // Add address modal
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormFor, setAddressFormFor] = useState<'shipping' | 'billing'>('shipping');
  const [formData, setFormData] = useState<AddressFormData>(emptyAddressForm);
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Photon
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetInputRef = useRef<HTMLDivElement>(null);

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await apiClient.get('/addresses');
      const list: Address[] = res.data?.data || [];
      setAddresses(list);

      const defaultAddr = list.find((a) => a.isDefault) || list[0] || null;
      if (defaultAddr) {
        setSelectedShippingId((prev) => prev ?? defaultAddr.id);
        setSelectedBillingId((prev) => prev ?? defaultAddr.id);
      }
    } catch (err) {
      console.error('Failed to load addresses', err);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { from: '/store/checkout' } });
      return;
    }

    const init = async () => {
      setInitLoading(true);
      try {
        await mergeGuestCart();
        await fetchCart();
        await fetchAddresses();
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [fetchCart, mergeGuestCart, navigate, fetchAddresses]);

  const subtotal = totalPrice;
  const shipping = subtotal > 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipping + tax;

  const selectedShipping = addresses.find((a) => a.id === selectedShippingId) || null;
  const selectedBilling = sameAsShipping
    ? selectedShipping
    : addresses.find((a) => a.id === selectedBillingId) || null;

  // ---- Address form helpers (Photon + Nominatim) ----
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
    } catch {
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
    return [
      [p.housenumber, p.street || p.name].filter(Boolean).join(' '),
      p.city,
      p.state,
      p.postcode,
      p.country,
    ]
      .filter(Boolean)
      .join(', ');
  };

  const getAddressFromNominatim = async (lat: number, lng: number) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
    );
    if (!response.ok) throw new Error('Nominatim request failed');
    return await response.json();
  };

  const extractAddressFromNominatim = (data: any) => {
    if (!data) throw new Error('No address found');
    const addr = data.address || {};

    const streetParts = [
      addr.house_number,
      addr.road ||
        addr.street ||
        addr.pedestrian ||
        addr.footway ||
        addr.path ||
        addr.residential,
    ].filter(Boolean);

    let streetAddress = streetParts.join(' ').trim();
    if (!streetAddress) {
      streetAddress =
        data.name ||
        (data.display_name ? data.display_name.split(',')[0].trim() : '');
    }

    const apartment =
      addr.neighbourhood ||
      addr.suburb ||
      addr.residential ||
      addr.quarter ||
      addr.city_district ||
      '';

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

    const state =
      addr.state || addr.state_district || addr.region || addr.county || '';

    return {
      streetAddress,
      apartment,
      city,
      state,
      zipCode: addr.postcode || '',
      country: addr.country || '',
    };
  };

  const handleAutofillLocation = () => {
    if (!window.isSecureContext) {
      setLocationError(
        'Location requires HTTPS or localhost. Please open the site via https:// or http://localhost'
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
        try {
          const data = await getAddressFromNominatim(
            position.coords.latitude,
            position.coords.longitude
          );
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
        } catch {
          setLocationError(
            'Got location but failed to convert to address. Please enter manually.'
          );
          setLocationSuccess(false);
        } finally {
          setIsLocating(false);
        }
      },
      (error: GeolocationPositionError) => {
        let message = 'Unable to retrieve your location. ';
        if (error.code === error.PERMISSION_DENIED) {
          message +=
            'Permission blocked. Allow location in browser settings and reload.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message += 'Location unavailable. Try again or enter manually.';
        } else if (error.code === error.TIMEOUT) {
          message += 'Request timed out. Try again or enter manually.';
        } else {
          message += 'Please enter your address manually.';
        }
        setLocationError(message);
        setLocationSuccess(false);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

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

  const openAddAddress = (forType: 'shipping' | 'billing') => {
    setAddressFormFor(forType);
    setFormData(emptyAddressForm);
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
    setShowAddressForm(true);
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setFormData(emptyAddressForm);
    setSuggestions([]);
    setShowSuggestions(false);
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
  };

  const handleAddressFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.fullName.trim() ||
      !formData.streetAddress.trim() ||
      !formData.city.trim() ||
      !formData.country.trim()
    ) {
      setAddressError('Please fill in all required fields');
      return;
    }
    setSubmittingAddress(true);
    setAddressError(null);
    try {
      const res = await apiClient.post('/addresses', formData);
      const newAddr: Address = res.data?.data;
      await fetchAddresses();
      if (newAddr?.id) {
        if (addressFormFor === 'shipping') {
          setSelectedShippingId(newAddr.id);
          if (sameAsShipping) setSelectedBillingId(newAddr.id);
        } else {
          setSelectedBillingId(newAddr.id);
          setSameAsShipping(false);
        }
      }
      closeAddressForm();
    } catch (err: any) {
      setAddressError(
        err?.response?.data?.message || 'Failed to save address'
      );
    } finally {
      setSubmittingAddress(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShipping) {
      alert('Please select or add a shipping address');
      return;
    }
    if (!sameAsShipping && !selectedBilling) {
      alert('Please select or add a billing address');
      return;
    }
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      await mergeGuestCart();

      const shippingText = formatAddress(selectedShipping);
      const billingText = sameAsShipping
        ? shippingText
        : formatAddress(selectedBilling!);

      const response = await apiClient.post('/orders', {
        shippingAddress: shippingText,
        billingAddress: billingText,
        paymentMethod,
      });

      setOrderId(response.data.data.id);
      setOrderPlaced(true);
      await clearCart();
      await fetchCart();

      setTimeout(() => {
        navigate('/store/orders');
      }, 3000);
    } catch (error: any) {
      console.error('Order placement failed:', error);
      alert(
        error.response?.data?.message ||
          'Failed to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const AddressCard = ({
    addr,
    selected,
    onSelect,
  }: {
    addr: Address;
    selected: boolean;
    onSelect: () => void;
  }) => (
    <label
      className={`flex gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
        selected
          ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
      }`}
    >
      <input
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="mt-1 w-4 h-4 text-purple-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">
            {addr.fullName}
          </span>
          {addr.isDefault && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              <Home className="w-3 h-3" />
              Default
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
          {addr.streetAddress}
          {addr.apartment ? `, ${addr.apartment}` : ''}
          <br />
          {addr.city}
          {addr.state ? `, ${addr.state}` : ''}
          {addr.zipCode ? ` - ${addr.zipCode}` : ''}
          <br />
          {addr.country}
          {addr.phone ? ` · ${addr.phone}` : ''}
        </p>
      </div>
    </label>
  );

  if (orderPlaced) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-green-100">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>
        <p className="text-gray-600 mt-2">
          Your order #{orderId} has been placed successfully.
        </p>
        <p className="text-sm text-gray-500 mt-1">Redirecting to your orders...</p>
      </div>
    );
  }

  if (initLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-500">Loading checkout...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-600">Your cart is empty</h2>
        <Link
          to="/store/products"
          className="text-purple-600 hover:underline mt-2 inline-block"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">
          Store
        </Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/cart" className="text-gray-500 hover:text-purple-600">
          Cart
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Checkout</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form
            onSubmit={handlePlaceOrder}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 space-y-6"
          >
            {/* Shipping Address */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  Shipping Address
                </h2>
                <button
                  type="button"
                  onClick={() => openAddAddress('shipping')}
                  className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800"
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
              </div>

              {addressesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading addresses...
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-300 rounded-xl">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">
                    No saved addresses yet
                  </p>
                  <button
                    type="button"
                    onClick={() => openAddAddress('shipping')}
                    className="inline-flex items-center gap-1 text-sm font-medium bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Shipping Address
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <AddressCard
                      key={addr.id}
                      addr={addr}
                      selected={selectedShippingId === addr.id}
                      onSelect={() => {
                        setSelectedShippingId(addr.id);
                        if (sameAsShipping) setSelectedBillingId(addr.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Same as shipping */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsShipping}
                onChange={(e) => {
                  setSameAsShipping(e.target.checked);
                  if (e.target.checked && selectedShippingId) {
                    setSelectedBillingId(selectedShippingId);
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-800">
                Billing address same as shipping
              </span>
            </label>

            {/* Billing Address */}
            {!sameAsShipping && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    Billing Address
                  </h2>
                  <button
                    type="button"
                    onClick={() => openAddAddress('billing')}
                    className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-800"
                  >
                    <Plus className="w-4 h-4" />
                    Add New
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-300 rounded-xl">
                    <p className="text-sm text-gray-500 mb-3">
                      No saved addresses
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddAddress('billing')}
                      className="inline-flex items-center gap-1 text-sm font-medium bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Billing Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <AddressCard
                        key={`bill-${addr.id}`}
                        addr={addr}
                        selected={selectedBillingId === addr.id}
                        onSelect={() => setSelectedBillingId(addr.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Cash on Delivery</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Online"
                    checked={paymentMethod === 'Online'}
                    onChange={() => setPaymentMethod('Online')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Online Payment (UPI/Card)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedShipping}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm text-gray-600"
                >
                  <span className="truncate mr-2">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="flex-shrink-0">
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600' : 'text-gray-600'}>
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (12%)</span>
                <span>₹{tax}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-purple-600">₹{total}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Truck className="w-4 h-4" />
              <span>Free shipping on orders above ₹999</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeAddressForm}
          />
          <div className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                Add {addressFormFor === 'shipping' ? 'Shipping' : 'Billing'}{' '}
                Address
              </h2>
              <button
                onClick={closeAddressForm}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {addressError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {addressError}
                </div>
              )}

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
                    <p className="text-xs text-red-600 mt-1">{locationError}</p>
                  ) : locationSuccess ? (
                    <p className="text-xs text-green-700 mt-1">
                      Address fields auto-filled.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600">
                      Free address detection via OpenStreetMap
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

              <form onSubmit={handleSaveAddress} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Country/Region
                  </label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
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
                    Full name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleAddressFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
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
                      placeholder="Street address, P.O. box, company name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
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
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    type="text"
                    name="apartment"
                    value={formData.apartment}
                    onChange={handleAddressFormChange}
                    placeholder="Apartment, suite, unit, floor, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 mt-2"
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
                    onChange={handleAddressFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
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
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
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
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
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
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50"
                    placeholder="(555) 555-5555"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    name="isDefault"
                    id="isDefaultCheckout"
                    checked={formData.isDefault}
                    onChange={handleAddressFormChange}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label
                    htmlFor="isDefaultCheckout"
                    className="text-sm text-gray-800"
                  >
                    Use as my default address
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddressForm}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-full font-medium text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAddress}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-full font-medium text-sm hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submittingAddress ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save address'
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

export default StoreCheckout;
