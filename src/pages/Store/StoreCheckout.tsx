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
      setShipmentProviderId(data?.providerId || null);
    } catch (err: any) {
      setRatesError(
        err?.response?.data?.message || 'Failed to fetch shipping rates'
      );
      setShippingRates([]);
    } finally {
      setRatesLoading(false);
    }
  }, [totalPrice]);
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
    const merchantOrderId = searchParams.get('merchantOrderId');
    if (status === 'success' && merchantOrderId) {
      setVerifyingPayment(true);
      apiClient
        .post('/orders/verify-payment', { merchantOrderId })
        .then((res) => {
          if (res.data?.success) {
            setOrderPlaced(true);
            setOrderId(res.data?.data?.id || null);
            clearCart();
          } else {
            setPaymentError(res.data?.message || 'Payment verification failed');
          }
        })
        .catch((err) => {
          setPaymentError(
            err?.response?.data?.message || 'Payment verification failed'
          );
        })
        .finally(() => setVerifyingPayment(false));
    }
  }, [searchParams, clearCart]);
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
      clearCart();
    } catch (err: any) {
      setPaymentError(
        err?.response?.data?.message || 'Failed to place order'
      );
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
          {orderId ? `Your order #${orderId} has been placed successfully.` : 'Your order has been placed successfully.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/store/orders"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            View Orders
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
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500 text-sm mb-3">No addresses saved yet</p>
                    <button
                      type="button"
                      onClick={openAddAddressForm}
                      className="text-purple-600 font-medium text-sm hover:underline"
                    >
                      Add your first address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedShippingId === addr.id
                            ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                            : 'border-gray-200 hover:border-purple-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingAddr"
                          checked={selectedShippingId === addr.id}
                          onChange={() => setSelectedShippingId(addr.id)}
                          className="mt-1 w-4 h-4 text-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">
                              {addr.fullName}
                            </span>
                            {addr.isDefault && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
                            {[addr.streetAddress, addr.apartment].filter(Boolean).join(', ')}
                            <br />
                            {[addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}
                            <br />
                            {addr.country}
                            {addr.phone ? ` · ${addr.phone}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              openEditAddressForm(addr);
                            }}
                            className="p-1.5 text-gray-400 hover:text-purple-600 rounded-full hover:bg-purple-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteAddress(addr.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
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
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <label htmlFor="sameAsShipping" className="text-sm text-gray-700">
                  Billing address same as shipping
                </label>
              </div>
              {!sameAsShipping && (
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3">
                    Billing Address
                  </h2>
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <label
                        key={`bill-${addr.id}`}
                        className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedBillingId === addr.id
                            ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                            : 'border-gray-200 hover:border-purple-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingAddr"
                          checked={selectedBillingId === addr.id}
                          onChange={() => setSelectedBillingId(addr.id)}
                          className="mt-1 w-4 h-4 text-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-900 text-sm">
                            {addr.fullName}
                          </span>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {[addr.streetAddress, addr.city, addr.zipCode]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
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
                                {rate.isStorePickup && rate.pickupLocationName
                                  ? rate.pickupLocationName
                                  : rate.courierName}
                              </span>
                              <span className="font-bold text-purple-700">
                                {rate.rate === 0 ? 'FREE' : `₹${rate.rate.toFixed(2)}`}
                              </span>
                            </div>
                            {rate.isStorePickup && rate.pickupLocationAddress && (
                              <p className="mt-1.5 text-xs text-gray-600 leading-relaxed flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                <span>{rate.pickupLocationAddress}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                              {rate.isStorePickup ? (
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                                  Store Pickup · Free
                                </span>
                              ) : rate.providerName ? (
                                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                                  {rate.providerName}
                                </span>
                              ) : null}
                              {rate.isDefaultPickup && (
                                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                                  <Home className="w-3 h-3" />
                                  Default
                                </span>
                              )}
                              {!rate.isStorePickup && rate.estimatedDays != null && (
                                <span className="inline-flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  {rate.estimatedDays} day
                                  {rate.estimatedDays !== 1 ? 's' : ''}
                                </span>
                              )}
                              {rate.etd && (rate.isStorePickup || !rate.estimatedDays) && (
                                <span>{rate.etd}</span>
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
          {step === 2 && (
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                {paymentProviders.length === 0 ? (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    No payment methods available. Please contact support.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentProviders.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedProviderId === p.id
                            ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                            : 'border-gray-200 hover:border-purple-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={selectedProviderId === p.id}
                          onChange={() => setSelectedProviderId(p.id)}
                          className="w-4 h-4 text-purple-600"
                        />
                        <div className="flex items-center gap-2">
                          {p.provider_key === 'cod' ? (
                            <Banknote className="w-5 h-5 text-green-600" />
                          ) : (
                            <CreditCard className="w-5 h-5 text-purple-600" />
                          )}
                          <span className="font-medium text-gray-900 text-sm">
                            {p.credentials?.display_label || p.name}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
                  disabled={loading || !selectedProviderId || !selectedCourier}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-4">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {items.map((item: any) => (
                <div key={item.id || item.variantId} className="flex gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {item.product?.name || item.name || 'Product'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium text-gray-900 shrink-0">
                    ₹
                    {(
                      (parseFloat(item.price) ||
                        parseFloat(item.variant?.price) ||
                        0) * (item.quantity || 1)
                    ).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
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
              {selectedCourier && (
                <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600">
                  <p className="font-medium text-gray-800">
                    {selectedCourier.isStorePickup && selectedCourier.pickupLocationName
                      ? selectedCourier.pickupLocationName
                      : selectedCourier.courierName}
                    {selectedCourier.isStorePickup
                      ? ' · Store Pickup'
                      : selectedCourier.providerName
                        ? ` · ${selectedCourier.providerName}`
                        : ''}
                  </p>
                  {selectedCourier.isStorePickup && selectedCourier.pickupLocationAddress && (
                    <p className="text-xs text-gray-500 mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
                      <span>{selectedCourier.pickupLocationAddress}</span>
                    </p>
                  )}
                  {!selectedCourier.isStorePickup && selectedCourier.estimatedDays != null && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Est. delivery: {selectedCourier.estimatedDays} day
                      {selectedCourier.estimatedDays !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Country
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
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Street address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="streetAddress"
                    value={addressForm.streetAddress}
                    onChange={handleAddressFormChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                  <input
                    type="text"
                    name="apartment"
                    value={addressForm.apartment}
                    onChange={handleAddressFormChange}
                    placeholder="Apartment, suite, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 mt-2"
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-1">
                      State
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
                      ZIP / Pincode
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={addressForm.zipCode}
                      onChange={handleAddressFormChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressFormChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isDefault"
                    id="addrDefault"
                    checked={addressForm.isDefault}
                    onChange={handleAddressFormChange}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600"
                  />
                  <label htmlFor="addrDefault" className="text-sm text-gray-800">
                    Set as default address
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
                    disabled={addressSubmitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-full font-medium text-sm hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
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
