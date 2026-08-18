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
  const [activeTab, setActiveTab] = useState<'order' | 'user' | 'shipment' | 'payment'>('order');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [shipModal, setShipModal] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shipLoading, setShipLoading] = useState(false);
  const [shipError, setShipError] = useState<string | null>(null);
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
    setCancelReason('');
    setTrackingUrl('');
    setCancelError(null);
    setShipError(null);
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
      const response = await apiClient.post(`/orders/admin/${selectedOrder.id}/cancel`, {
        reason: cancelReason.trim(),
      });
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
    if (!trackingUrl.trim()) {
      setShipError('Tracking URL is required');
      return;
    }
    try {
      setShipLoading(true);
      setShipError(null);
      const response = await apiClient.post(`/orders/admin/${selectedOrder.id}/ship`, {
        trackingUrl: trackingUrl.trim(),
      });
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
    return `₹${(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
              <p className="text-sm text-gray-500">{formatDate(selectedOrder.createdAt)}</p>
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
                Total: <span className="font-semibold text-gray-900">{formatCurrency(selectedOrder.total)}</span>
              </span>
              {selectedOrder.merchantOrderId && (
                <span className="text-xs text-gray-400 font-mono">{selectedOrder.merchantOrderId}</span>
              )}
            </div>
            {(selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered') && (
              <div className="flex flex-wrap gap-2">
                {selectedOrder.status !== 'shipped' && (
                  <button
                    onClick={() => {
                      setShipModal(true);
                      setShipError(null);
                      setTrackingUrl(selectedOrder.trackingUrl || '');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
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
                        <p className="font-semibold text-gray-900">#{selectedOrder.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Status</p>
                        <p className="font-semibold text-gray-900 capitalize">{selectedOrder.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Items</p>
                        <p className="font-semibold text-gray-900">{selectedOrder.items?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(selectedOrder.total)}</p>
                      </div>
                    </div>
                    {selectedOrder.cancellationReason && (
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                        <p className="font-medium text-red-800">Cancellation Reason</p>
                        <p className="text-red-700 mt-1">{selectedOrder.cancellationReason}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Line Items</h3>
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
                                      (e.target as HTMLImageElement).style.display = 'none';
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
                                  {item.variant?.sku ? ` · SKU: ${item.variant.sku}` : ''}
                                </p>
                                <div className="flex items-center justify-between mt-1.5 text-sm">
                                  <span className="text-gray-600">Qty: {item.quantity}</span>
                                  <span className="font-medium text-gray-900">
                                    {formatCurrency(Number(item.price) * item.quantity)}
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
                        {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">No items found</p>
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
                          <p className="font-semibold text-gray-900">{selectedOrder.user.fullName}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Email</p>
                          <p className="font-semibold text-gray-900 break-all">{selectedOrder.user.email}</p>
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
                      <p className="text-sm text-gray-500">User details not available</p>
                    )}
                  </div>
                )}
                {activeTab === 'shipment' && (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Shipping Address</p>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {selectedOrder.shippingAddress || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Billing Address</p>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
                        {selectedOrder.billingAddress || selectedOrder.shippingAddress || '—'}
                      </p>
                    </div>
                    {selectedOrder.trackingUrl && (
                      <div>
                        <p className="text-gray-500 mb-1">Tracking URL</p>
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
                    {!selectedOrder.trackingUrl && selectedOrder.status === 'shipped' && (
                      <p className="text-amber-600 text-sm">Tracking URL not set</p>
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
                    {selectedOrder.paymentDetails &&
                      Object.keys(selectedOrder.paymentDetails).length > 0 && (
                        <div>
                          <p className="text-gray-500 mb-1">Payment Details</p>
                          <pre className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-xs overflow-x-auto font-mono text-gray-700">
                            {JSON.stringify(selectedOrder.paymentDetails, null, 2)}
                          </pre>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
        {cancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Cancel Order</h3>
                <button
                  onClick={() => setCancelModal(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Please provide a reason for cancelling order #{selectedOrder?.id}.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Cancellation reason..."
              />
              {cancelError && (
                <p className="text-sm text-red-600">{cancelError}</p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setCancelModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-70 flex items-center gap-2"
                >
                  {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {shipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Mark as Shipped</h3>
                <button
                  onClick={() => setShipModal(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Enter the tracking URL for order #{selectedOrder?.id}.
              </p>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://tracking.example.com/..."
              />
              {shipError && <p className="text-sm text-red-600">{shipError}</p>}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShipModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
                <button
                  onClick={handleShipOrder}
                  disabled={shipLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-70 flex items-center gap-2"
                >
                  {shipLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Shipped
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pagination.total} order{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 sm:hidden"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4 ${
          showFilters ? 'block' : 'hidden sm:block'
        }`}
      >
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or Merchant Order ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {PAYMENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        {(statusFilter || paymentStatusFilter || search || startDate || endDate) && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse"
            >
              <div className="flex justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-16 text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">No orders found</h2>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting your filters or check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            return (
              <button
                key={order.id}
                onClick={() => openOrderDetail(order.id)}
                className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-purple-100 transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">Order #{order.id}</span>
                      {order.merchantOrderId && (
                        <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                          {order.merchantOrderId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {order.user?.fullName || 'Customer'} · {order.user?.email || '—'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                    <p className="text-sm text-gray-500">
                      {(order.items?.length || 0)} item{(order.items?.length || 0) !== 1 ? 's' : ''} ·{' '}
                      <span className="font-medium text-gray-800">{formatCurrency(order.total)}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      {order.paymentStatus} · {order.paymentMethod || '—'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => fetchOrders(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchOrders(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
export default Orders;
