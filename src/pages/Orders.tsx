import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Filter,
  X,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  CreditCard,
  Loader2,
  ExternalLink,
  RefreshCw,
  Plus,
} from 'lucide-react';
import axios from 'axios';
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
interface OrderItem {
  id: number;
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  costPrice: number | null;
  product?: {
    id: string;
    name: string;
    images?: { url: string }[];
  };
  variant?: {
    id: string;
    size?: string;
    color?: string;
    sku?: string;
  };
}
interface OrderUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role?: string;
  createdAt?: string;
}
interface Order {
  id: number;
  userId: string;
  total: number;
  status: string;
  shippingAddress: string | null;
  billingAddress: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  paymentProviderId?: string | null;
  merchantOrderId?: string | null;
  paymentDetails?: Record<string, any>;
  cancellationReason?: string | null;
  trackingUrl?: string | null;
  shippingAmount?: number | null;
  estimatedDeliveryDays?: number | null;
  shipmentProviderId?: string | null;
  courierCompanyId?: string | null;
  courierName?: string | null;
  shiprocketOrderId?: string | null;
  shiprocketShipmentId?: string | null;
  awbCode?: string | null;
  shipmentStatus?: string | null;
  shipmentDetails?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: OrderUser;
  items?: OrderItem[];
}
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
interface ShipmentProvider {
  id: string;
  name: string;
  provider_key: string;
  is_enabled: boolean;
}
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];
const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All Payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'cod', label: 'COD' },
  { value: 'failed', label: 'Failed' },
];
const getStatusConfig = (status: string) => {
  const statusMap: Record<
    string,
    { label: string; icon: React.ElementType; color: string; bg: string }
  > = {
    pending: {
      label: 'Pending',
      icon: Clock,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50 border-yellow-200',
    },
    processing: {
      label: 'Processing',
      icon: AlertCircle,
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    shipped: {
      label: 'Shipped',
      icon: Truck,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50 border-indigo-200',
    },
    delivered: {
      label: 'Delivered',
      icon: CheckCircle,
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200',
    },
    cancelled: {
      label: 'Cancelled',
      icon: XCircle,
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
    },
  };
  return (
    statusMap[status] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      icon: Package,
      color: 'text-gray-700',
      bg: 'bg-gray-50 border-gray-200',
    }
  );
};
const hasShipmentProvider = (order: Order) =>
  !!(
    order.shipmentProviderId ||
    order.courierName ||
    order.shiprocketOrderId ||
    order.awbCode
  );
const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'order' | 'user' | 'shipment' | 'payment'
  >('order');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [shipModal, setShipModal] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shipLoading, setShipLoading] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
  // Shipment management
  const [shipmentActionLoading, setShipmentActionLoading] = useState(false);
  const [shipmentActionError, setShipmentActionError] = useState<string | null>(
    null
  );
  const [createShipmentModal, setCreateShipmentModal] = useState(false);
  const [shipmentProviders, setShipmentProviders] = useState<ShipmentProvider[]>(
    []
  );
  const [selectedShipmentProviderId, setSelectedShipmentProviderId] = useState<
    string | null
  >(null);
  const [createShipmentLoading, setCreateShipmentLoading] = useState(false);
  const [createShipmentError, setCreateShipmentError] = useState<string | null>(
    null
  );
  const fetchOrders = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const params: Record<string, string | number> = {
          page,
          limit: pagination.limit,
        };
        if (statusFilter) params.status = statusFilter;
        if (paymentStatusFilter) params.paymentStatus = paymentStatusFilter;
        if (search.trim()) params.search = search.trim();
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const response = await apiClient.get('/orders/admin/all', { params });
        setOrders(response.data.data || []);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            'Failed to load orders'
        );
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, paymentStatusFilter, search, startDate, endDate, pagination.limit]
  );
  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter, paymentStatusFilter, startDate, endDate]);
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };
  const clearFilters = () => {
    setStatusFilter('');
    setPaymentStatusFilter('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchOrders(1), 0);
  };
  const openOrderDetail = async (orderId: number) => {
    try {
      setDetailLoading(true);
      setActiveTab('order');
      setShipmentActionError(null);
      const response = await apiClient.get(`/orders/admin/${orderId}`);
      setSelectedOrder(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch order detail:', err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to load order details'
      );
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    setSelectedOrder(null);
    setCancelModal(false);
    setShipModal(false);
    setCreateShipmentModal(false);
    setCancelReason('');
    setTrackingUrl('');
    setCancelError(null);
    setShipError(null);
    setShipmentActionError(null);
    setCreateShipmentError(null);
  };
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      setCancelError('Cancellation reason is required');
      return;
    }
    try {
      setCancelLoading(true);
      setCancelError(null);
      const response = await apiClient.post(
        `/orders/admin/${selectedOrder.id}/cancel`,
        { reason: cancelReason.trim() }
      );
      setSelectedOrder(response.data.data);
      setCancelModal(false);
      setCancelReason('');
      fetchOrders(pagination.page);
    } catch (err: any) {
      setCancelError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to cancel order'
      );
    } finally {
      setCancelLoading(false);
    }
  };
  const handleShipOrder = async () => {
    if (!selectedOrder) return;
    if (!hasShipmentProvider(selectedOrder)) {
      setShipError(
        'Cannot mark as shipped: no shipment provider associated. Create a shipment first.'
      );
      return;
    }
    try {
      setShipLoading(true);
      setShipError(null);
      const response = await apiClient.post(
        `/orders/admin/${selectedOrder.id}/ship`,
        { trackingUrl: trackingUrl.trim() || undefined }
      );
      setSelectedOrder(response.data.data);
      setShipModal(false);
      setTrackingUrl('');
      fetchOrders(pagination.page);
    } catch (err: any) {
      setShipError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to mark order as shipped'
      );
    } finally {
      setShipLoading(false);
    }
  };
  const handleRefreshShipment = async () => {
    if (!selectedOrder) return;
    try {
      setShipmentActionLoading(true);
      setShipmentActionError(null);
      const response = await apiClient.post(
        `/orders/admin/${selectedOrder.id}/shipment/refresh`
      );
      setSelectedOrder(response.data.data);
    } catch (err: any) {
      setShipmentActionError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to refresh shipment status'
      );
    } finally {
      setShipmentActionLoading(false);
    }
  };
  const handleCancelShipment = async () => {
    if (!selectedOrder) return;
    if (
      !window.confirm(
        'Cancel the existing shipment with the courier? This does not cancel the order itself.'
      )
    ) {
      return;
    }
    try {
      setShipmentActionLoading(true);
      setShipmentActionError(null);
      const response = await apiClient.post(
        `/orders/admin/${selectedOrder.id}/shipment/cancel`
      );
      setSelectedOrder(response.data.data);
      fetchOrders(pagination.page);
    } catch (err: any) {
      setShipmentActionError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to cancel shipment'
      );
    } finally {
      setShipmentActionLoading(false);
    }
  };
  const openCreateShipmentModal = async () => {
    setCreateShipmentError(null);
    setSelectedShipmentProviderId(null);
    try {
      const res = await apiClient.get('/orders/shipment-providers');
      const list: ShipmentProvider[] = res.data?.data || [];
      setShipmentProviders(list);
      if (list.length > 0) {
        setSelectedShipmentProviderId(list[0].id);
      }
    } catch {
      setShipmentProviders([]);
    }
    setCreateShipmentModal(true);
  };
  const handleCreateShipment = async () => {
    if (!selectedOrder) return;
    try {
      setCreateShipmentLoading(true);
      setCreateShipmentError(null);
      const response = await apiClient.post(
        `/orders/admin/${selectedOrder.id}/shipment/create`,
        {
          shipmentProviderId: selectedShipmentProviderId || undefined,
        }
      );
      setSelectedOrder(response.data.data);
      setCreateShipmentModal(false);
      fetchOrders(pagination.page);
    } catch (err: any) {
      setCreateShipmentError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to create shipment'
      );
    } finally {
      setCreateShipmentLoading(false);
    }
  };
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${(num || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
  if (selectedOrder || detailLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 px-3 sm:px-0">
        <div className="flex items-center gap-3">
          <button
            onClick={closeDetail}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Order #{selectedOrder?.id || '...'}
            </h1>
            {selectedOrder && (
              <p className="text-sm text-gray-500">
                {formatDate(selectedOrder.createdAt)}
              </p>
            )}
          </div>
        </div>
        {detailLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : selectedOrder ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const cfg = getStatusConfig(selectedOrder.status);
                const Icon = cfg.icon;
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </span>
                );
              })()}
              <span className="text-sm text-gray-500">
                Total:{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(selectedOrder.total)}
                </span>
              </span>
              {selectedOrder.merchantOrderId && (
                <span className="text-xs text-gray-400 font-mono">
                  {selectedOrder.merchantOrderId}
                </span>
              )}
            </div>
            {selectedOrder.status !== 'cancelled' &&
              selectedOrder.status !== 'delivered' && (
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status !== 'shipped' && (
                    <button
                      onClick={() => {
                        setShipModal(true);
                        setShipError(null);
                        setTrackingUrl(selectedOrder.trackingUrl || '');
                      }}
                      disabled={!hasShipmentProvider(selectedOrder)}
                      title={
                        !hasShipmentProvider(selectedOrder)
                          ? 'Create a shipment first'
                          : undefined
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Truck className="w-4 h-4" />
                      Mark as Shipped
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCancelModal(true);
                      setCancelError(null);
                      setCancelReason('');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                </div>
              )}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {(
                  [
                    { key: 'order', label: 'Order Details', icon: Package },
                    { key: 'user', label: 'User Details', icon: User },
                    { key: 'shipment', label: 'Shipment', icon: MapPin },
                    { key: 'payment', label: 'Payment', icon: CreditCard },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? 'border-purple-600 text-purple-700'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="p-4 sm:p-6">
                {activeTab === 'order' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Order ID</p>
                        <p className="font-semibold text-gray-900">
                          #{selectedOrder.id}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-semibold text-gray-900 capitalize">
                          {selectedOrder.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Items</p>
                        <p className="font-semibold text-gray-900">
                          {selectedOrder.items?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(selectedOrder.total)}
                        </p>
                      </div>
                    </div>
                    {selectedOrder.cancellationReason && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                        <p className="font-medium text-red-800">
                          Cancellation Reason
                        </p>
                        <p className="text-red-700 mt-1">
                          {selectedOrder.cancellationReason}
                        </p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Line Items
                      </h3>
                      <div className="space-y-3">
                        {(selectedOrder.items || []).map((item) => {
                          const imgUrl =
                            item.product?.images && item.product.images.length > 0
                              ? item.product.images[0].url
                              : null;
                          return (
                            <div
                              key={item.id}
                              className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                              <div className="w-14 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={item.product?.name || 'Product'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display =
                                        'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Package className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {item.product?.name || 'Product'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {[item.variant?.color, item.variant?.size]
                                    .filter(Boolean)
                                    .join(' · ') || 'Default'}
                                  {item.variant?.sku
                                    ? ` · SKU: ${item.variant.sku}`
                                    : ''}
                                </p>
                                <div className="flex items-center justify-between mt-1.5 text-sm">
                                  <span className="text-gray-600">
                                    Qty: {item.quantity}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(
                                      Number(item.price) * item.quantity
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400">
                                  Unit: {formatCurrency(item.price)}
                                  {item.costPrice != null && (
                                    <> · Cost: {formatCurrency(item.costPrice)}</>
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        {(!selectedOrder.items ||
                          selectedOrder.items.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No items found
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'user' && (
                  <div className="space-y-4">
                    {selectedOrder.user ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Full Name</p>
                          <p className="font-semibold text-gray-900">
                            {selectedOrder.user.fullName}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="font-semibold text-gray-900 break-all">
                            {selectedOrder.user.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Phone</p>
                          <p className="font-semibold text-gray-900">
                            {selectedOrder.user.phone || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Role</p>
                          <p className="font-semibold text-gray-900 capitalize">
                            {selectedOrder.user.role || 'user'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">User ID</p>
                          <p className="font-mono text-xs text-gray-700 break-all">
                            {selectedOrder.user.id}
                          </p>
                        </div>
                        {selectedOrder.user.createdAt && (
                          <div>
                            <p className="text-gray-500">Member Since</p>
                            <p className="font-semibold text-gray-900">
                              {formatDate(selectedOrder.user.createdAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        User details not available
                      </p>
                    )}
                  </div>
                )}
                {activeTab === 'shipment' && (
                  <div className="space-y-5 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Shipping Address</p>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {selectedOrder.shippingAddress || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Billing Address</p>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {selectedOrder.billingAddress ||
                          selectedOrder.shippingAddress ||
                          '—'}
                      </p>
                    </div>
                    {/* Shipment provider details */}
                    {hasShipmentProvider(selectedOrder) ? (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
                        <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Shipment Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedOrder.courierName && (
                            <div>
                              <p className="text-gray-500 text-xs">Courier</p>
                              <p className="font-medium text-gray-900">
                                {selectedOrder.courierName}
                              </p>
                            </div>
                          )}
                          {selectedOrder.courierCompanyId && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Courier Company ID
                              </p>
                              <p className="font-medium text-gray-900">
                                {selectedOrder.courierCompanyId}
                              </p>
                            </div>
                          )}
                          {selectedOrder.shippingAmount != null && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Shipping Amount
                              </p>
                              <p className="font-medium text-gray-900">
                                {formatCurrency(selectedOrder.shippingAmount)}
                              </p>
                            </div>
                          )}
                          {selectedOrder.estimatedDeliveryDays != null && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Est. Delivery
                              </p>
                              <p className="font-medium text-gray-900">
                                {selectedOrder.estimatedDeliveryDays} day
                                {selectedOrder.estimatedDeliveryDays !== 1
                                  ? 's'
                                  : ''}
                              </p>
                            </div>
                          )}
                          {selectedOrder.shipmentStatus && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Shipment Status
                              </p>
                              <p className="font-medium text-gray-900 capitalize">
                                {selectedOrder.shipmentStatus}
                              </p>
                            </div>
                          )}
                          {selectedOrder.awbCode && (
                            <div>
                              <p className="text-gray-500 text-xs">AWB Code</p>
                              <p className="font-medium text-gray-900 font-mono">
                                {selectedOrder.awbCode}
                              </p>
                            </div>
                          )}
                          {selectedOrder.shiprocketOrderId && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Shiprocket Order ID
                              </p>
                              <p className="font-medium text-gray-900 font-mono">
                                {selectedOrder.shiprocketOrderId}
                              </p>
                            </div>
                          )}
                          {selectedOrder.shiprocketShipmentId && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Shiprocket Shipment ID
                              </p>
                              <p className="font-medium text-gray-900 font-mono">
                                {selectedOrder.shiprocketShipmentId}
                              </p>
                            </div>
                          )}
                          {selectedOrder.shipmentProviderId && (
                            <div>
                              <p className="text-gray-500 text-xs">
                                Provider ID
                              </p>
                              <p className="font-mono text-xs text-gray-700 break-all">
                                {selectedOrder.shipmentProviderId}
                              </p>
                            </div>
                          )}
                        </div>
                        {selectedOrder.trackingUrl && (
                          <div>
                            <p className="text-gray-500 text-xs mb-1">
                              Tracking URL
                            </p>
                            <a
                              href={selectedOrder.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-medium break-all"
                            >
                              {selectedOrder.trackingUrl}
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-amber-800 text-sm">
                        No shipment provider associated with this order yet.
                      </div>
                    )}
                    {shipmentActionError && (
                      <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-3 py-2">
                        {shipmentActionError}
                      </div>
                    )}
                    {/* Shipment actions */}
                    {selectedOrder.status !== 'cancelled' &&
                      selectedOrder.status !== 'delivered' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {(selectedOrder.shiprocketShipmentId ||
                            selectedOrder.awbCode) && (
                            <button
                              type="button"
                              onClick={handleRefreshShipment}
                              disabled={shipmentActionLoading}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                              {shipmentActionLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              Refresh Status
                            </button>
                          )}
                          {(selectedOrder.shiprocketOrderId ||
                            selectedOrder.awbCode) &&
                            selectedOrder.shipmentStatus !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={handleCancelShipment}
                                disabled={shipmentActionLoading}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                Cancel Shipment
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={openCreateShipmentModal}
                            disabled={shipmentActionLoading}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            {hasShipmentProvider(selectedOrder)
                              ? 'Create New Shipment'
                              : 'Create Shipment'}
                          </button>
                        </div>
                      )}
                  </div>
                )}
                {activeTab === 'payment' && (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500">Payment Method</p>
                        <p className="font-semibold text-gray-900">
                          {selectedOrder.paymentMethod || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Payment Status</p>
                        <p className="font-semibold text-gray-900 capitalize">
                          {selectedOrder.paymentStatus}
                        </p>
                      </div>
                      {selectedOrder.merchantOrderId && (
                        <div>
                          <p className="text-gray-500">Merchant Order ID</p>
                          <p className="font-mono text-xs text-gray-700">
                            {selectedOrder.merchantOrderId}
                          </p>
                        </div>
                      )}
                      {selectedOrder.paymentProviderId && (
                        <div>
                          <p className="text-gray-500">Payment Provider ID</p>
                          <p className="font-mono text-xs text-gray-700 break-all">
                            {selectedOrder.paymentProviderId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Cancel Order Modal */}
            {cancelModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Cancel Order</h3>
                  {cancelError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {cancelError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason *
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Enter cancellation reason"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCancelModal(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      disabled={cancelLoading}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelLoading ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Ship Modal */}
            {shipModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Mark as Shipped</h3>
                  {!hasShipmentProvider(selectedOrder) && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded">
                      No shipment provider is associated. Create a shipment first
                      from the Shipment tab.
                    </div>
                  )}
                  {shipError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {shipError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking URL (optional)
                    </label>
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://..."
                    />
                    {selectedOrder.awbCode && (
                      <p className="text-xs text-gray-500 mt-1">
                        AWB present — tracking URL will default to Shiprocket if
                        left empty.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShipModal(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleShipOrder}
                      disabled={shipLoading || !hasShipmentProvider(selectedOrder)}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {shipLoading ? 'Updating...' : 'Mark Shipped'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Create Shipment Modal */}
            {createShipmentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
                  <h3 className="font-semibold text-gray-900">Create Shipment</h3>
                  <p className="text-sm text-gray-500">
                    Create a new shipment in Shiprocket for this order. The
                    cheapest available courier will be selected automatically if
                    none is specified.
                  </p>
                  {createShipmentError && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {createShipmentError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipment Provider
                    </label>
                    {shipmentProviders.length === 0 ? (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                        No enabled shipment providers. Configure one in Shipment
                        Providers Setup.
                      </p>
                    ) : (
                      <select
                        value={selectedShipmentProviderId || ''}
                        onChange={(e) =>
                          setSelectedShipmentProviderId(e.target.value || null)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {shipmentProviders.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.provider_key ? ` (${p.provider_key})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateShipmentModal(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateShipment}
                      disabled={
                        createShipmentLoading || shipmentProviders.length === 0
                      }
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {createShipmentLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Shipment'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto space-y-6 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage store orders and shipments
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>
      {/* Filters */}
      <div
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4 ${
          showFilters ? 'block' : 'hidden sm:block'
        }`}
      >
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or merchant ID"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
          >
            Search
          </button>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        {(statusFilter ||
          paymentStatusFilter ||
          search ||
          startDate ||
          endDate) && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-100">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => {
              const cfg = getStatusConfig(order.status);
              const Icon = cfg.icon;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openOrderDetail(order.id)}
                  className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          Order #{order.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        {hasShipmentProvider(order) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium">
                            <Truck className="w-3 h-3" />
                            {order.courierName || 'Shipment'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {order.user?.fullName || 'Customer'} ·{' '}
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.items?.length || 0} item
                        {(order.items?.length || 0) !== 1 ? 's' : ''} ·{' '}
                        {formatCurrency(order.total)} ·{' '}
                        <span className="capitalize">{order.paymentStatus}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders(pagination.page - 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOrders(pagination.page + 1)}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default Orders;
