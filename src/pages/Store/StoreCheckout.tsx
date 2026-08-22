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
  Navigation,
  LocateFixed,
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
  isStorePickup?: boolean;
  isFreeShipping?: boolean;
  pickupLocationId?: number | null;
  pickupLocationName?: string | null;
  pickupLocationAddress?: string | null;
  isDefaultPickup?: boolean;
}
interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    district?: string;
    locality?: string;
  };
  geometry?: {
    coordinates?: [number, number];
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
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  const [selectedBillingId, setSelectedBillingId] = useState<number | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormData>(emptyAddressForm);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<ShippingRate | null>(null);
  const [shipmentProviderId, setShipmentProviderId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streetInputRef = useRef<HTMLDivElement>(null);
  const selectedShipping = addresses.find((a) => a.id === selectedShippingId) || null;
  const selectedBilling = addresses.find((a) => a.id === selectedBillingId) || null;
  const selectedProvider = paymentProviders.find((p) => p.id === selectedProviderId) || null;
  const shipping = selectedCourier ? selectedCourier.rate : 0;
  const grandTotal = (totalPrice || 0) + shipping;
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
  const fetchShippingRates = useCallback(
    async (addr: Address) => {
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
        setShipmentProviderId(data?.providerId || null);
      } catch (err: any) {
        setRatesError(
          err?.response?.data?.message || 'Failed to fetch shipping rates'
        );
        setShippingRates([]);
      } finally {
        setRatesLoading(false);
      }
    },
    [totalPrice]
  );
  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      try {
        await Promise.all([fetchAddresses(), fetchPaymentProviders(), fetchCart()]);
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [fetchAddresses, fetchPaymentProviders, fetchCart]);
  useEffect(() => {
    const status = searchParams.get('status');
    const payment = searchParams.get('payment');
    const orderIdParam = searchParams.get('orderId');
    const merchantOrderId = searchParams.get('merchantOrderId');
    const returningFromPayment =
      (payment === 'phonepe' && orderIdParam) ||
      (status === 'success' && (orderIdParam || merchantOrderId));
    if (!returningFromPayment) return;
    const resolveOrderId = async (): Promise<number | null> => {
      if (orderIdParam && !Number.isNaN(Number(orderIdParam))) {
        return Number(orderIdParam);
      }
      if (merchantOrderId) {
        try {
          const listRes = await apiClient.get('/orders');
          const list = listRes.data?.data || [];
          const match = list.find(
            (o: any) => o.merchantOrderId === merchantOrderId
          );
          if (match?.id) return match.id;
        } catch (_) {}
      }
      return null;
    };
    setVerifyingPayment(true);
    setPaymentError(null);
    (async () => {
      try {
        const oid = await resolveOrderId();
        if (!oid) {
          const msg = 'Could not verify payment. Please check your orders.';
          setPaymentError(msg);
          try {
            sessionStorage.setItem('checkoutError', msg);
          } catch (_) {}
          navigate(`/store/cart?error=${encodeURIComponent(msg)}`, {
            replace: true,
          });
          return;
        }
        const res = await apiClient.post(`/orders/${oid}/verify-payment`);
        const payload = res.data?.data;
        const paid =
          payload?.paid === true ||
          payload?.state === 'paid' ||
          payload?.state === 'cod';
        if (res.data?.success && paid) {
          clearCart();
          navigate(`/store/order/${oid}`, { replace: true });
          return;
        }
        const msg =
          res.data?.message ||
          'Payment was not completed. Please try again or choose another method.';
        setPaymentError(msg);
        try {
          sessionStorage.setItem('checkoutError', msg);
        } catch (_) {}
        navigate(`/store/cart?error=${encodeURIComponent(msg)}`, {
          replace: true,
        });
      } catch (err: any) {
        const msg =
          err?.response?.data?.message || 'Payment verification failed';
        setPaymentError(msg);
        try {
          sessionStorage.setItem('checkoutError', msg);
        } catch (_) {}
        navigate(`/store/cart?error=${encodeURIComponent(msg)}`, {
          replace: true,
        });
      } finally {
        setVerifyingPayment(false);
      }
    })();
  }, [searchParams, clearCart, navigate]);
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
  const openAddAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setShowAddressForm(true);
  };
  const openEditAddressForm = (addr: Address) => {
    setEditingAddressId(addr.id);
    setAddressForm({
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
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
    setSuggestions([]);
    setShowSuggestions(false);
    setShowAddressForm(true);
  };
  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setAddressError(null);
    setLocationError(null);
    setLocationSuccess(false);
    setSuggestions([]);
    setShowSuggestions(false);
  };
  const handleAddressFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (name === 'streetAddress') {
      setLocationSuccess(false);
      setLocationError(null);
    }
  };
  const fetchPhotonSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query.trim()
        )}&limit=6&lang=en`
      );
      const data = await res.json();
      const features: PhotonFeature[] = data?.features || [];
      setSuggestions(features);
      setShowSuggestions(features.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);
  const handleStreetAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setAddressForm((prev) => ({ ...prev, streetAddress: value }));
    setLocationSuccess(false);
    setLocationError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPhotonSuggestions(value);
    }, 350);
  };
  const applyPhotonFeature = (feature: PhotonFeature) => {
    const p = feature.properties || {};
    const streetParts = [
      p.housenumber,
      p.street || p.name,
    ].filter(Boolean);
    const street = streetParts.join(' ').trim() || p.name || '';
    setAddressForm((prev) => ({
      ...prev,
      streetAddress: street || prev.streetAddress,
      city: p.city || p.locality || p.district || prev.city,
      state: p.state || prev.state,
      zipCode: p.postcode || prev.zipCode,
      country: p.country || prev.country || 'India',
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&addressdetails=1`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          );
          if (!res.ok) throw new Error('Reverse geocode failed');
          const data = await res.json();
          const addr = data?.address || {};
          const streetParts = [
            addr.house_number,
            addr.road || addr.pedestrian || addr.footway || addr.path,
          ].filter(Boolean);
          const street =
            streetParts.join(' ').trim() ||
            addr.suburb ||
            addr.neighbourhood ||
            data?.display_name?.split(',')[0] ||
            '';
          setAddressForm((prev) => ({
            ...prev,
            streetAddress: street || prev.streetAddress,
            apartment: addr.suburb || addr.neighbourhood || prev.apartment,
            city:
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.county ||
              prev.city,
            state: addr.state || prev.state,
            zipCode: addr.postcode || prev.zipCode,
            country: addr.country || prev.country || 'India',
          }));
          setLocationSuccess(true);
          setLocationError(null);
          setSuggestions([]);
          setShowSuggestions(false);
        } catch {
          setLocationError(
            'Could not fetch address for your location. Please enter manually.'
          );
          setLocationSuccess(false);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        let msg = 'Unable to retrieve your location';
        if (err.code === 1) {
          msg = 'Location permission denied. Please allow location access.';
        } else if (err.code === 2) {
          msg = 'Location unavailable. Please try again.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationError(msg);
        setLocationSuccess(false);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !addressForm.fullName.trim() ||
      !addressForm.streetAddress.trim() ||
      !addressForm.city.trim()
    ) {
      setAddressError('Please fill in all required fields (Full name, Street address, City)');
      return;
    }
    setAddressSubmitting(true);
    setAddressError(null);
    try {
      if (editingAddressId) {
        await apiClient.put(`/addresses/${editingAddressId}`, addressForm);
      } else {
        const res = await apiClient.post('/addresses', addressForm);
        const created = res.data?.data;
        if (created?.id) {
          setSelectedShippingId(created.id);
          if (sameAsShipping) setSelectedBillingId(created.id);
        }
      }
      closeAddressForm();
      await fetchAddresses();
    } catch (err: any) {
      setAddressError(
        err?.response?.data?.message || 'Failed to save address'
      );
    } finally {
      setAddressSubmitting(false);
    }
  };
  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await apiClient.delete(`/addresses/${id}`);
      if (selectedShippingId === id) setSelectedShippingId(null);
      if (selectedBillingId === id) setSelectedBillingId(null);
      await fetchAddresses();
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
        isStorePickup: !!selectedCourier.isStorePickup,
        isFreeShipping: !!selectedCourier.isFreeShipping,
        pickupLocationId: selectedCourier.pickupLocationId || null,
        pickupLocationName: selectedCourier.pickupLocationName || null,
        pickupLocationAddress:
          selectedCourier.pickupLocationAddress || null,
        shipmentDetails: selectedCourier.isStorePickup
          ? {
              type: 'store_pickup',
              pickupLocationId: selectedCourier.pickupLocationId || null,
              pickupLocationName:
                selectedCourier.pickupLocationName || null,
              pickupLocationAddress:
                selectedCourier.pickupLocationAddress || null,
            }
          : selectedCourier.isFreeShipping
          ? {
              type: 'free_shipping',
              message: 'Free shipping applied',
            }
          : undefined,
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
      const newOrderId = data?.data?.id;
      clearCart();
      if (newOrderId) {
        navigate(`/store/order/${newOrderId}`, { replace: true });
      } else {
        navigate('/store/orders', { replace: true });
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Failed to place order';
      setPaymentError(msg);
      try {
        sessionStorage.setItem('checkoutError', msg);
      } catch (_) {}
      navigate(`/store/cart?error=${encodeURIComponent(msg)}`, {
        replace: true,
      });
    } finally {
      setLoading(false);
    }
  };
  if (initLoading || verifyingPayment) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }
  if (orderPlaced) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-gray-600 mb-6">
          {orderId
            ? `Your order #${orderId} has been placed successfully.`
            : 'Your order has been placed successfully.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={orderId ? `/store/order/${orderId}` : '/store/orders'}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            View Order
          </Link>
          <Link
            to="/store/home"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <Link
          to="/store/products"
          className="inline-block mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Browse Products
        </Link>
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => {
                if (i < step) setStep(i);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                i === step
                  ? 'bg-purple-600 text-white'
                  : i < step
                  ? 'bg-purple-100 text-purple-700 cursor-pointer'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                {i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-6 h-px bg-gray-300 shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {paymentError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {paymentError}
            </div>
          )}
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
                    onClick={openAddAddressForm}
                    className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add new
                  </button>
                </div>
                {addressesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <p className="text-gray-500 text-sm mb-3">No saved addresses</p>
                    <button
                      type="button"
                      onClick={openAddAddressForm}
                      className="text-purple-600 font-medium text-sm"
                    >
                      Add your first address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedShippingId === addr.id
                            ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShippingId === addr.id}
                          onChange={() => {
                            setSelectedShippingId(addr.id);
                            if (sameAsShipping) setSelectedBillingId(addr.id);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {addr.fullName}
                            {addr.isDefault && (
                              <span className="ml-2 text-xs text-purple-600 font-normal">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-0.5 whitespace-pre-line">
                            {formatAddress(addr)}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              openEditAddressForm(addr);
                            }}
                            className="p-1.5 text-gray-400 hover:text-purple-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteAddress(addr.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sameAsShipping"
                  checked={sameAsShipping}
                  onChange={(e) => {
                    setSameAsShipping(e.target.checked);
                    if (e.target.checked && selectedShippingId) {
                      setSelectedBillingId(selectedShippingId);
                    }
                  }}
                />
                <label htmlFor="sameAsShipping" className="text-sm text-gray-700">
                  Billing address same as shipping
                </label>
              </div>
              {!sameAsShipping && (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4 text-purple-600" />
                    Billing Address
                  </h2>
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={`bill-${addr.id}`}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${
                          selectedBillingId === addr.id
                            ? 'border-purple-500 bg-purple-50/50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billing"
                          checked={selectedBillingId === addr.id}
                          onChange={() => setSelectedBillingId(addr.id)}
                          className="mt-1"
                        />
                        <div className="text-sm">
                          <div className="font-medium">{addr.fullName}</div>
                          <div className="text-gray-600 whitespace-pre-line">
                            {formatAddress(addr)}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={goToShippingStep}
                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                Continue to Shipping
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                Select Shipping Option
              </h2>
              {ratesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                </div>
              ) : ratesError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {ratesError}
                  <button
                    type="button"
                    onClick={() =>
                      selectedShipping && fetchShippingRates(selectedShipping)
                    }
                    className="ml-2 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : shippingRates.length === 0 ? (
                <p className="text-gray-500 text-sm">No shipping options available.</p>
              ) : (
                <div className="space-y-3">
                  {shippingRates.map((rate) => (
                    <label
                      key={`${rate.courierCompanyId}-${rate.providerId}`}
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedCourier?.courierCompanyId === rate.courierCompanyId &&
                        selectedCourier?.providerId === rate.providerId
                          ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="courier"
                        checked={
                          selectedCourier?.courierCompanyId ===
                            rate.courierCompanyId &&
                          selectedCourier?.providerId === rate.providerId
                        }
                        onChange={() => handleSelectCourier(rate)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {rate.courierName}
                          </span>
                          {rate.isStorePickup && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              Free pickup
                            </span>
                          )}
                          {rate.isFreeShipping && (
                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Free shipping
                            </span>
                          )}
                        </div>
                        {rate.isStorePickup && rate.pickupLocationAddress && (
                          <div className="text-xs text-gray-600 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{rate.pickupLocationAddress}</span>
                          </div>
                        )}
                        {!rate.isStorePickup && !rate.isFreeShipping && rate.estimatedDays != null && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Est. {rate.estimatedDays} day
                            {rate.estimatedDays !== 1 ? 's' : ''}
                            {rate.etd ? ` · ${rate.etd}` : ''}
                          </div>
                        )}
                        {rate.isFreeShipping && rate.etd && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {rate.etd}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 flex-shrink-0">
                        {rate.rate === 0 ? 'FREE' : `₹${rate.rate.toFixed(2)}`}
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={goToPaymentStep}
                  disabled={!selectedCourier}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  Continue to Payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  Payment Method
                </h2>
                {paymentProviders.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No payment methods configured.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {paymentProviders.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer ${
                          selectedProviderId === p.id
                            ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-200'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedProviderId === p.id}
                          onChange={() => setSelectedProviderId(p.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {p.provider_key === 'cod' ? (
                              <Banknote className="w-4 h-4 text-green-600" />
                            ) : (
                              <CreditCard className="w-4 h-4 text-purple-600" />
                            )}
                            {p.credentials?.display_label || p.name}
                          </div>
                          {p.credentials?.instructions && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {p.credentials.instructions}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedCourier && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <Package className="w-4 h-4" />
                    {selectedCourier.courierName}
                    {selectedCourier.isFreeShipping && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Free
                      </span>
                    )}
                  </div>
                  {selectedCourier.isStorePickup &&
                    selectedCourier.pickupLocationAddress && (
                      <div className="text-xs mt-1 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5" />
                        <span>{selectedCourier.pickupLocationAddress}</span>
                      </div>
                    )}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedProviderId}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing order...
                    </>
                  ) : (
                    <>
                      Place Order · ₹{grandTotal.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Order Summary</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item: any) => (
                <div
                  key={item.id || `${item.productId}-${item.variantId}`}
                  className="flex gap-2 text-sm"
                >
                  <div className="flex-1 min-w-0 truncate text-gray-700">
                    {item.product?.name || item.name || 'Item'} × {item.quantity}
                  </div>
                  <div className="text-gray-900 font-medium">
                    ₹
                    {(
                      (item.variant?.price || item.product?.basePrice || item.price || 0) *
                      item.quantity
                    ).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{(totalPrice || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>
                  {selectedCourier
                    ? selectedCourier.rate === 0
                      ? 'FREE'
                      : `₹${selectedCourier.rate.toFixed(2)}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base pt-1">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Address Form Modal – matched to StoreSettingsAdmin pickup form layout */}
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeAddressForm}
          />
          <div className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">
                {editingAddressId ? 'Edit address' : 'Add address'}
              </h2>
              <button
                type="button"
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
              {/* Use current location */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 hover:border-purple-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLocating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Detecting location...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-4 h-4" />
                      Use my current location
                    </>
                  )}
                </button>
                {locationError && (
                  <p className="mt-2 text-xs text-red-600">{locationError}</p>
                )}
                {locationSuccess && !locationError && (
                  <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Location applied — please review the fields below
                  </p>
                )}
              </div>
              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Country/Region
                  </label>
                  <select
                    name="country"
                    value={addressForm.country}
                    onChange={handleAddressFormChange}
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
                  <div className="relative" ref={streetInputRef}>
                    <div className="relative">
                      <input
                        type="text"
                        name="streetAddress"
                        value={addressForm.streetAddress}
                        onChange={handleStreetAddressChange}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        required
                        autoComplete="off"
                        placeholder="Street address, P.O. box, company name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 pr-9"
                      />
                      {isLoadingSuggestions && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                      )}
                      {!isLoadingSuggestions && addressForm.streetAddress && (
                        <Navigation className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      )}
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((feat, idx) => {
                          const p = feat.properties || {};
                          const label = [
                            p.housenumber,
                            p.street || p.name,
                            p.city || p.locality,
                            p.state,
                            p.postcode,
                            p.country,
                          ]
                            .filter(Boolean)
                            .join(', ');
                          return (
                            <li key={idx}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition flex items-start gap-2"
                                onClick={() => applyPhotonFeature(feat)}
                              >
                                <MapPin className="w-3.5 h-3.5 mt-0.5 text-purple-400 shrink-0" />
                                <span className="leading-snug">{label || p.name}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <input
                    type="text"
                    name="apartment"
                    value={addressForm.apartment}
                    onChange={handleAddressFormChange}
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
                    value={addressForm.city}
                    onChange={handleAddressFormChange}
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
                    value={addressForm.state}
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Zip Code / PIN
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={addressForm.zipCode}
                    onChange={handleAddressFormChange}
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
                    value={addressForm.phone}
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isDefault"
                      id="isDefaultAddress"
                      checked={addressForm.isDefault}
                      onChange={handleAddressFormChange}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isDefaultAddress" className="text-sm text-gray-800">
                      Set as default address
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddressForm}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-full font-medium text-sm hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressSubmitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-full font-medium text-sm hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {addressSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingAddressId ? (
                      'Update address'
                    ) : (
                      'Add address'
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
