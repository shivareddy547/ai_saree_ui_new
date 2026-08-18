import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import axios from 'axios';
import {
  CheckCircle,
  ArrowRight,
  CreditCard,
  ShoppingBag,
  MapPin,
  Plus,
  Loader2,
  X,
  Home,
  Banknote,
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
interface PaymentProvider {
  id: string;
  name: string;
  provider_key: string;
  is_enabled: boolean;
  credentials: {
    environment?: string;
    display_label?: string;
    instructions?: string | null;
    min_order_amount?: string | null;
    max_order_amount?: string | null;
    extra_charge?: string | null;
  };
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
  const [searchParams] = useSearchParams();
  const { items, totalPrice, clearCart, fetchCart, mergeGuestCart } = useCart();
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
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
  const fetchPaymentProviders = useCallback(async () => {
    try {
      const res = await apiClient.get('/orders/payment-providers');
      const list: PaymentProvider[] = res.data?.data || [];
      setPaymentProviders(list);
      if (list.length > 0 && !selectedProviderId) {
        // Prefer COD if available, else first
        const cod = list.find((p) => p.provider_key === 'cod');
        setSelectedProviderId(cod ? cod.id : list[0].id);
      }
    } catch (err) {
      console.error('Failed to load payment providers', err);
    }
  }, [selectedProviderId]);
  // Handle return from PhonePe
  useEffect(() => {
    const returnedOrderId = searchParams.get('orderId');
    const payment = searchParams.get('payment');
    if (returnedOrderId && payment === 'phonepe') {
      setVerifyingPayment(true);
      setPaymentError(null);
      apiClient
        .post(`/orders/${returnedOrderId}/verify-payment`)
        .then((res) => {
          if (res.data?.data?.paid) {
            setOrderId(Number(returnedOrderId));
            setOrderPlaced(true);
            clearCart().then(() => fetchCart());
            setTimeout(() => navigate('/store/orders'), 3000);
          } else {
            setPaymentError(
              `Payment not completed (${res.data?.data?.state || 'PENDING'}). You can try again or contact support.`
            );
          }
        })
        .catch((err) => {
          setPaymentError(
            err?.response?.data?.message || 'Failed to verify payment status'
          );
        })
        .finally(() => setVerifyingPayment(false));
    }
  }, [searchParams, clearCart, fetchCart, navigate]);
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
        await fetchPaymentProviders();
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [fetchCart, mergeGuestCart, navigate, fetchAddresses, fetchPaymentProviders]);
  const selectedProvider = paymentProviders.find((p) => p.id === selectedProviderId) || null;
  const isCod = selectedProvider?.provider_key === 'cod';
  const extraCodCharge = isCod
    ? parseFloat(selectedProvider?.credentials?.extra_charge || '0') || 0
    : 0;
  const subtotal = totalPrice;
  const shipping = subtotal > 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipping + tax + extraCodCharge;
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
    if (!selectedProviderId) {
      alert('Please select a payment method');
      return;
    }
    setLoading(true);
    setPaymentError(null);
    try {
      await mergeGuestCart();
      const shippingText = formatAddress(selectedShipping);
      const billingText = sameAsShipping
        ? shippingText
        : formatAddress(selectedBilling!);
      const redirectBaseUrl = `${window.location.origin}/store/checkout`;
      const response = await apiClient.post('/orders', {
        shippingAddress: shippingText,
        billingAddress: billingText,
        paymentMethod: selectedProvider?.provider_key || 'COD',
        paymentProviderId: selectedProviderId,
        redirectBaseUrl,
      });
      const data = response.data;
      if (data.paymentRequired && data.redirectUrl) {
        // Redirect to PhonePe
        window.location.href = data.redirectUrl;
        return;
      }
      // COD or immediate success
      setOrderId(data.data.id);
      setOrderPlaced(true);
      await clearCart();
      await fetchCart();
      setTimeout(() => {
        navigate('/store/orders');
      }, 3000);
    } catch (error: any) {
      console.error('Order placement failed:', error);
      setPaymentError(
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
  if (verifyingPayment) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verifying payment...</h2>
        <p className="text-gray-600 mt-2">Please wait while we confirm your PhonePe payment.</p>
      </div>
    );
  }
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
      {paymentError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-100">
          {paymentError}
        </div>
      )}
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
            {/* Payment Method - Dynamic from enabled providers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              {paymentProviders.length === 0 ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  No payment methods are currently enabled. Please contact the store administrator.
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentProviders.map((provider) => {
                    const label =
                      provider.credentials?.display_label || provider.name;
                    const isSelected = selectedProviderId === provider.id;
                    const isCodOption = provider.provider_key === 'cod';
                    return (
                      <label
                        key={provider.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentProvider"
                          value={provider.id}
                          checked={isSelected}
                          onChange={() => setSelectedProviderId(provider.id)}
                          className="mt-1 w-4 h-4 text-purple-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isCodOption ? (
                              <Banknote className="w-5 h-5 text-gray-600" />
                            ) : (
                              <CreditCard className="w-5 h-5 text-gray-600" />
                            )}
                            <span className="font-medium">{label}</span>
                            {provider.provider_key === 'phonepe' && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                PhonePe
                              </span>
                            )}
                          </div>
                          {isCodOption && provider.credentials?.instructions && (
                            <p className="text-xs text-gray-500 mt-1">
                              {provider.credentials.instructions}
                            </p>
                          )}
                          {isCodOption && extraCodCharge > 0 && isSelected && (
                            <p className="text-xs text-amber-700 mt-1">
                              Extra COD charge: ₹{extraCodCharge}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !selectedShipping || !selectedProviderId || paymentProviders.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading
                ? isCod
                  ? 'Placing Order...'
                  : 'Redirecting to Payment...'
                : isCod
                ? 'Place Order (Cash on Delivery)'
                : 'Pay & Place Order'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal ({items.length} items)</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (12%)</span>
                <span className="font-medium">₹{tax.toFixed(2)}</span>
              </div>
              {extraCodCharge > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>COD Charge</span>
                  <span className="font-medium">₹{extraCodCharge.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-purple-700">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Add Address Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                Add {addressFormFor === 'shipping' ? 'Shipping' : 'Billing'} Address
              </h3>
              <button type="button" onClick={closeAddressForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-4 space-y-4">
              {addressError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{addressError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleAddressFormChange}
                  className="input-field"
                  required
                />
              </div>
              <div ref={streetInputRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleStreetChange}
                  className="input-field"
                  required
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-auto">
                    {suggestions.map((f, i) => (
                      <li
                        key={i}
                        className="px-3 py-2 text-sm hover:bg-purple-50 cursor-pointer"
                        onClick={() => selectSuggestion(f)}
                      >
                        {getSuggestionLabel(f)}
                      </li>
                    ))}
                  </ul>
                )}
                {isLoadingSuggestions && (
                  <p className="text-xs text-gray-400 mt-1">Searching...</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apartment / Landmark</label>
                <input
                  name="apartment"
                  value={formData.apartment}
                  onChange={handleAddressFormChange}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleAddressFormChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    name="state"
                    value={formData.state}
                    onChange={handleAddressFormChange}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleAddressFormChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                  <input
                    name="country"
                    value={formData.country}
                    onChange={handleAddressFormChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleAddressFormChange}
                  className="input-field"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleAddressFormChange}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-gray-700">Set as default address</span>
              </div>
              <button
                type="button"
                onClick={handleAutofillLocation}
                disabled={isLocating}
                className="text-sm text-purple-600 hover:underline disabled:opacity-50"
              >
                {isLocating ? 'Getting location...' : 'Use my current location'}
              </button>
              {locationError && <p className="text-xs text-red-600">{locationError}</p>}
              {locationSuccess && <p className="text-xs text-green-600">Location filled successfully</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingAddress}
                  className="btn-primary flex-1"
                >
                  {submittingAddress ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={closeAddressForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StoreCheckout;
