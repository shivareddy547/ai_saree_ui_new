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
  isStorePickup?: boolean;
  pickupLocationId?: number | null;
  pickupLocationName?: string | null;
  pickupLocationAddress?: string | null;
  isDefaultPickup?: boolean;
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
  const [suggestions, setSuggestions] = useState<any[]>([]);
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
  // After PhonePe / gateway return: verify payment then go to order details (or cart on failure)
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
  const openAddAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setAddressError(null);
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
    setShowAddressForm(true);
  };
  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setAddressError(null);
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
  };
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !addressForm.fullName.trim() ||
      !addressForm.streetAddress.trim() ||
      !addressForm.city.trim()
    ) {
      setAddressError('Please fill in all required fields');
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
        // Gateway redirect (PhonePe etc.) – cart cleared only after successful verify
        window.location.href = data.redirectUrl;
        return;
      }
      // COD / immediate success → order details
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
      // Requirement: on placement error, show cart with error
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
                        </div>
                        {rate.isStorePickup && rate.pickupLocationAddress && (
                          <div className="text-xs text-gray-600 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{rate.pickupLocationAddress}</span>
                          </div>
                        )}
                        {!rate.isStorePickup && rate.estimatedDays != null && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Est. {rate.estimatedDays} day
                            {rate.estimatedDays !== 1 ? 's' : ''}
                            {rate.etd ? ` · ${rate.etd}` : ''}
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
                    {item.product?.name || 'Item'} × {item.quantity}
                  </div>
                  <div className="text-gray-900 font-medium">
                    ₹
                    {(
                      (item.variant?.price || item.product?.basePrice || 0) *
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
      {showAddressForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingAddressId ? 'Edit Address' : 'Add Address'}
              </h3>
              <button type="button" onClick={closeAddressForm}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {addressError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">
                {addressError}
              </div>
            )}
            <form onSubmit={handleAddressSubmit} className="space-y-3">
              <input
                name="fullName"
                value={addressForm.fullName}
                onChange={handleAddressFormChange}
                placeholder="Full name *"
                className="input-field"
                required
              />
              <input
                name="streetAddress"
                value={addressForm.streetAddress}
                onChange={handleAddressFormChange}
                placeholder="Street address *"
                className="input-field"
                required
              />
              <input
                name="apartment"
                value={addressForm.apartment}
                onChange={handleAddressFormChange}
                placeholder="Apartment, suite, etc."
                className="input-field"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="city"
                  value={addressForm.city}
                  onChange={handleAddressFormChange}
                  placeholder="City *"
                  className="input-field"
                  required
                />
                <input
                  name="state"
                  value={addressForm.state}
                  onChange={handleAddressFormChange}
                  placeholder="State"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="zipCode"
                  value={addressForm.zipCode}
                  onChange={handleAddressFormChange}
                  placeholder="PIN code"
                  className="input-field"
                />
                <input
                  name="phone"
                  value={addressForm.phone}
                  onChange={handleAddressFormChange}
                  placeholder="Phone"
                  className="input-field"
                />
              </div>
              <input
                name="country"
                value={addressForm.country}
                onChange={handleAddressFormChange}
                placeholder="Country"
                className="input-field"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={addressForm.isDefault}
                  onChange={handleAddressFormChange}
                />
                Set as default address
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="btn-primary flex-1"
                >
                  {addressSubmitting ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={closeAddressForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
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
