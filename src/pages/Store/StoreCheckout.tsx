import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import axios from 'axios';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  MapPin,
  Plus,
  Loader2,
  X,
  Home,
  Banknote,
  Pencil,
  Trash2,
  Truck,
  Package,
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
interface ShippingRate {
  courierCompanyId: string;
  courierName: string;
  rate: number;
  estimatedDays: number | null;
  etd?: string | null;
  freightCharge?: number;
  codCharges?: number;
  isSurface?: boolean;
  rating?: number | null;
  providerId?: string;
  providerKey?: string;
  providerName?: string;
  shippingMode?: string;
  rawCourierId?: string;
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
const STEPS = ['Address', 'Shipping', 'Payment'] as const;
const StoreCheckout: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, totalPrice, clearCart, fetchCart, mergeGuestCart } = useCart();
  const [step, setStep] = useState(0);
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
  // Shipping rates
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<ShippingRate | null>(null);
  const [shipmentProviderId, setShipmentProviderId] = useState<string | null>(null);
  // Add/Edit address modal
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormFor, setAddressFormFor] = useState<'shipping' | 'billing'>('shipping');
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
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
        const cod = list.find((p) => p.provider_key === 'cod');
        setSelectedProviderId(cod ? cod.id : list[0].id);
      }
    } catch (err) {
      console.error('Failed to load payment providers', err);
    }
  }, [selectedProviderId]);
  const fetchShippingRates = useCallback(async (addr: Address) => {
    if (!addr?.zipCode) {
      setRatesError('Selected address must have a valid ZIP / pincode');
      setShippingRates([]);
      return;
    }
    setRatesLoading(true);
    setRatesError(null);
    setSelectedCourier(null);
    setShipmentProviderId(null);
    try {
      const res = await apiClient.post('/orders/shipping-rates', {
        deliveryPincode: addr.zipCode,
        weight: 0.5,
        cod: 0,
        declaredValue: totalPrice || 0,
      });
      const data = res.data?.data;
      const rates: ShippingRate[] = data?.rates || [];
      setShippingRates(rates);
      // Keep primary providerId for backward compat; selection overrides per rate
      setShipmentProviderId(data?.providerId || null);
      if (rates.length === 0) {
        setRatesError('No shipping options available for this pincode.');
      }
    } catch (err: any) {
      setShippingRates([]);
      setRatesError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to fetch shipping rates. Please try again.'
      );
    } finally {
      setRatesLoading(false);
    }
  }, [totalPrice]);
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
  const selectedProvider =
    paymentProviders.find((p) => p.id === selectedProviderId) || null;
  const isCod = selectedProvider?.provider_key === 'cod';
  const extraCodCharge = isCod
    ? parseFloat(selectedProvider?.credentials?.extra_charge || '0') || 0
    : 0;
  const subtotal = totalPrice;
  const shipping = selectedCourier ? selectedCourier.rate : 0;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipping + tax + extraCodCharge;
  const selectedShipping =
    addresses.find((a) => a.id === selectedShippingId) || null;
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
    setEditingAddress(null);
    setFormData(emptyAddressForm);
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
    setShowAddressForm(true);
  };
  const openEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setFormData({
      country: addr.country,
      fullName: addr.fullName,
      streetAddress: addr.streetAddress,
      apartment: addr.apartment || '',
      city: addr.city,
      state: addr.state || '',
      zipCode: addr.zipCode || '',
      phone: addr.phone || '',
      isDefault: addr.isDefault,
    });
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
    setShowAddressForm(true);
  };
  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
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
  const handleSubmitAddress = async (e: React.FormEvent) => {
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
      let newAddr: Address | undefined;
      if (editingAddress) {
        const res = await apiClient.put(
          `/addresses/${editingAddress.id}`,
          formData
        );
        newAddr = res.data?.data;
      } else {
        const res = await apiClient.post('/addresses', formData);
        newAddr = res.data?.data;
      }
      await fetchAddresses();
      if (newAddr?.id) {
        if (!editingAddress) {
          if (addressFormFor === 'shipping') {
            setSelectedShippingId(newAddr.id);
            if (sameAsShipping) setSelectedBillingId(newAddr.id);
          } else {
            setSelectedBillingId(newAddr.id);
            setSameAsShipping(false);
          }
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
  const handleDeleteAddress = async (addr: Address) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the address for "${addr.fullName}"?`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/addresses/${addr.id}`);
      await fetchAddresses();
      if (selectedShippingId === addr.id) {
        setSelectedShippingId(null);
      }
      if (selectedBillingId === addr.id) {
        setSelectedBillingId(null);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete address');
    }
  };
  const goToShippingStep = () => {
    if (!selectedShipping) {
      alert('Please select or add a shipping address');
      return;
    }
    if (!sameAsShipping && !selectedBilling) {
      alert('Please select or add a billing address');
      return;
    }
    setStep(1);
    fetchShippingRates(selectedShipping);
  };
  const goToPaymentStep = () => {
    if (!selectedCourier) {
      alert('Please select a shipping option');
      return;
    }
    setStep(2);
  };
  const handleSelectCourier = (rate: ShippingRate) => {
    setSelectedCourier(rate);
    if (rate.providerId) {
      setShipmentProviderId(rate.providerId);
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
    if (!selectedCourier) {
      alert('Please select a shipping option');
      setStep(1);
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
        shippingAmount: selectedCourier.rate,
        estimatedDeliveryDays: selectedCourier.estimatedDays,
        shipmentProviderId:
          selectedCourier.providerId || shipmentProviderId,
        courierCompanyId: selectedCourier.courierCompanyId,
        courierName: selectedCourier.courierName,
        shippingMode: selectedCourier.shippingMode,
        rawCourierId: selectedCourier.rawCourierId,
        shippingAddressObj: {
          fullName: selectedShipping.fullName,
          streetAddress: selectedShipping.streetAddress,
          apartment: selectedShipping.apartment,
          city: selectedShipping.city,
          state: selectedShipping.state,
          zipCode: selectedShipping.zipCode,
          country: selectedShipping.country,
          phone: selectedShipping.phone,
        },
      });
      const data = response.data;
      if (data.paymentRequired && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
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
    onEdit,
    onDelete,
  }: {
    addr: Address;
    selected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
  }) => (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
        selected
          ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
          : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
        <input
          type="radio"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 w-4 h-4 text-purple-600 flex-shrink-0"
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
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center mt-2 sm:mt-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 text-gray-500 hover:text-purple-600 rounded-full hover:bg-purple-50 transition"
          aria-label="Edit address"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition"
          aria-label="Delete address"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
  if (verifyingPayment) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Verifying payment...</h2>
        <p className="text-gray-600 mt-2">
          Please wait while we confirm your PhonePe payment.
        </p>
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
      {/* Step indicator - mobile friendly */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((label, idx) => (
          <React.Fragment key={label}>
            <button
              type="button"
              onClick={() => {
                if (idx < step) setStep(idx);
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition ${
                idx === step
                  ? 'bg-purple-50 text-purple-700'
                  : idx < step
                  ? 'text-purple-600 cursor-pointer'
                  : 'text-gray-400'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  idx === step
                    ? 'bg-purple-600 text-white'
                    : idx < step
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {idx < step ? '✓' : idx + 1}
              </span>
              <span className="text-xs font-medium hidden sm:block">{label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 max-w-[40px] ${
                  idx < step ? 'bg-purple-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {paymentError && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-100">
          {paymentError}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-sm border border-purple-100 space-y-6">
            {/* STEP 0: Address */}
            {step === 0 && (
              <>
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
                          onEdit={() => openEditAddress(addr)}
                          onDelete={() => handleDeleteAddress(addr)}
                        />
                      ))}
                    </div>
                  )}
                </div>
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
                            onEdit={() => openEditAddress(addr)}
                            onDelete={() => handleDeleteAddress(addr)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={goToShippingStep}
                  disabled={!selectedShipping}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  Continue to Shipping
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
            {/* STEP 1: Shipping providers */}
            {step === 1 && (
              <>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-purple-600" />
                    Select Shipping Option
                  </h2>
                  {selectedShipping && (
                    <p className="text-sm text-gray-500 mb-4">
                      Delivering to {selectedShipping.city}
                      {selectedShipping.zipCode
                        ? ` (${selectedShipping.zipCode})`
                        : ''}
                    </p>
                  )}
                  {ratesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                      Fetching available shipping options...
                    </div>
                  ) : ratesError ? (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-lg p-4">
                      {ratesError}
                      <button
                        type="button"
                        onClick={() =>
                          selectedShipping && fetchShippingRates(selectedShipping)
                        }
                        className="block mt-2 text-purple-600 font-medium hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : shippingRates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No shipping options available for this location.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shippingRates.map((rate) => {
                        const isSelected =
                          selectedCourier?.courierCompanyId ===
                          rate.courierCompanyId;
                        return (
                          <label
                            key={rate.courierCompanyId}
                            className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                                : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="courier"
                              checked={isSelected}
                              onChange={() => handleSelectCourier(rate)}
                              className="mt-1 w-4 h-4 text-purple-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {rate.courierName}
                                </span>
                                <span className="font-bold text-purple-700">
                                  ₹{rate.rate.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                {rate.providerName && (
                                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                                    {rate.providerName}
                                  </span>
                                )}
                                {rate.estimatedDays != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5" />
                                    {rate.estimatedDays} day
                                    {rate.estimatedDays !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {rate.etd && !rate.estimatedDays && (
                                  <span>ETD: {rate.etd}</span>
                                )}
                                {rate.isSurface && (
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                                    Surface
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goToPaymentStep}
                    disabled={!selectedCourier}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    Continue to Payment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            {/* STEP 2: Payment */}
            {step === 2 && (
              <form onSubmit={handlePlaceOrder} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  {paymentProviders.length === 0 ? (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      No payment methods are currently enabled. Please contact the
                      store administrator.
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
                              {isCodOption &&
                                provider.credentials?.instructions && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {provider.credentials.instructions}
                                  </p>
                                )}
                              {isCodOption &&
                                extraCodCharge > 0 &&
                                isSelected && (
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
                {selectedCourier && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        {selectedCourier.courierName}
                        {selectedCourier.providerName
                          ? ` · ${selectedCourier.providerName}`
                          : ''}
                      </span>
                      <span className="font-medium">
                        ₹{selectedCourier.rate.toFixed(2)}
                      </span>
                    </div>
                    {selectedCourier.estimatedDays != null && (
                      <p className="text-xs text-gray-500 mt-1">
                        Est. delivery: {selectedCourier.estimatedDays} day
                        {selectedCourier.estimatedDays !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !selectedShipping ||
                      !selectedProviderId ||
                      !selectedCourier ||
                      paymentProviders.length === 0
                    }
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {loading
                      ? isCod
                        ? 'Placing Order...'
                        : 'Redirecting to Payment...'
                      : isCod
                      ? 'Place Order (COD)'
                      : 'Pay & Place Order'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal ({items.length} items)
                </span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {selectedCourier
                    ? `₹${shipping.toFixed(2)}`
                    : 'Select option'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (12%)</span>
                <span className="font-medium">₹{tax.toFixed(2)}</span>
              </div>
              {extraCodCharge > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>COD Charge</span>
                  <span className="font-medium">
                    ₹{extraCodCharge.toFixed(2)}
                  </span>
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
      {/* Add/Edit Address Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {editingAddress
                  ? 'Edit Address'
                  : `Add ${
                      addressFormFor === 'shipping' ? 'Shipping' : 'Billing'
                    } Address`}
              </h3>
              <button
                type="button"
                onClick={closeAddressForm}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitAddress} className="p-4 space-y-4">
              {addressError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {addressError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleAddressFormChange}
                  className="input-field"
                  required
                />
              </div>
              <div ref={streetInputRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apartment / Landmark
                </label>
                <input
                  name="apartment"
                  value={formData.apartment}
                  onChange={handleAddressFormChange}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleAddressFormChange}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleAddressFormChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
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
                <span className="text-sm text-gray-700">
                  Set as default address
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutofillLocation}
                disabled={isLocating}
                className="text-sm text-purple-600 hover:underline disabled:opacity-50"
              >
                {isLocating ? 'Getting location...' : 'Use my current location'}
              </button>
              {locationError && (
                <p className="text-xs text-red-600">{locationError}</p>
              )}
              {locationSuccess && (
                <p className="text-xs text-green-600">
                  Location filled successfully
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submittingAddress}
                  className="btn-primary flex-1"
                >
                  {submittingAddress
                    ? 'Saving...'
                    : editingAddress
                    ? 'Update Address'
                    : 'Save Address'}
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
