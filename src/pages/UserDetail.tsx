import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Package,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Edit2,
  X,
  Clock,
  Truck,
  AlertCircle,
  Search,
  Filter,
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
interface Address {
  id: number;
  user_id: string;
  full_name: string;
  street_address: string;
  apartment?: string | null;
  city: string;
  state?: string | null;
  zip_code?: string | null;
  country: string;
  phone?: string | null;
  is_default: boolean;
  createdAt?: string;
  updatedAt?: string;
}
interface UserDetailData {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  addresses?: Address[];
}
interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    images?: { url: string }[];
  };
  variant?: {
    size?: string;
    color?: string;
    sku?: string;
  };
}
interface Order {
  id: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
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
const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile');
  const [statusLoading, setStatusLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersPagination, setOrdersPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStartDate, setOrderStartDate] = useState('');
  const [orderEndDate, setOrderEndDate] = useState('');
  const [showOrderFilters, setShowOrderFilters] = useState(false);
  const [editAddress, setEditAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    full_name: '',
    street_address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    phone: '',
    is_default: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/user/admin/${id}`);
      setUser(response.data.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to load user'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);
  const fetchOrders = useCallback(
    async (page = 1) => {
      if (!id) return;
      try {
        setOrdersLoading(true);
        const params: Record<string, string | number> = {
          page,
          limit: ordersPagination.limit,
        };
        if (orderStatusFilter) params.status = orderStatusFilter;
        if (orderPaymentFilter) params.paymentStatus = orderPaymentFilter;
        if (orderSearch.trim()) params.search = orderSearch.trim();
        if (orderStartDate) params.startDate = orderStartDate;
        if (orderEndDate) params.endDate = orderEndDate;
        const response = await apiClient.get(`/user/admin/${id}/orders`, { params });
        setOrders(response.data.data || []);
        if (response.data.pagination) {
          setOrdersPagination(response.data.pagination);
        }
      } catch (err: any) {
        console.error('Failed to fetch user orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    },
    [
      id,
      orderStatusFilter,
      orderPaymentFilter,
      orderSearch,
      orderStartDate,
      orderEndDate,
      ordersPagination.limit,
    ]
  );
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders(1);
    }
  }, [activeTab, orderStatusFilter, orderPaymentFilter, orderStartDate, orderEndDate]);
  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus = !(user.isActive !== false);
    try {
      setStatusLoading(true);
      const response = await apiClient.patch(`/user/admin/${user.id}/status`, {
        isActive: newStatus,
      });
      setUser((prev) =>
        prev ? { ...prev, isActive: response.data.data.isActive } : prev
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to update status'
      );
    } finally {
      setStatusLoading(false);
    }
  };
  const openEditAddress = (addr: Address) => {
    setEditAddress(addr);
    setAddressForm({
      full_name: addr.full_name || '',
      street_address: addr.street_address || '',
      apartment: addr.apartment || '',
      city: addr.city || '',
      state: addr.state || '',
      zip_code: addr.zip_code || '',
      country: addr.country || '',
      phone: addr.phone || '',
      is_default: !!addr.is_default,
    });
    setAddressError(null);
  };
  const handleSaveAddress = async () => {
    if (!user || !editAddress) return;
    if (!addressForm.full_name.trim() || !addressForm.street_address.trim() || !addressForm.city.trim() || !addressForm.country.trim()) {
      setAddressError('Full name, street address, city and country are required');
      return;
    }
    try {
      setAddressSaving(true);
      setAddressError(null);
      const response = await apiClient.put(
        `/user/admin/${user.id}/addresses/${editAddress.id}`,
        addressForm
      );
      const updated = response.data.data;
      setUser((prev) => {
        if (!prev) return prev;
        const addresses = (prev.addresses || []).map((a) =>
          a.id === updated.id ? updated : addressForm.is_default ? { ...a, is_default: false } : a
        );
        return { ...prev, addresses };
      });
      setEditAddress(null);
    } catch (err: any) {
      setAddressError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to update address'
      );
    } finally {
      setAddressSaving(false);
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
  const clearOrderFilters = () => {
    setOrderStatusFilter('');
    setOrderPaymentFilter('');
    setOrderSearch('');
    setOrderStartDate('');
    setOrderEndDate('');
    setTimeout(() => fetchOrders(1), 0);
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }
  if (error && !user) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 px-3 sm:px-0">
        <button
          onClick={() => navigate('/users')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-purple-600"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Users
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      </div>
    );
  }
  if (!user) return null;
  const isActive = user.isActive !== false;
  return (
    <div className="max-w-5xl mx-auto space-y-4 px-3 sm:px-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {user.fullName}
          </h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${
            isActive
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {isActive ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleToggleStatus}
          disabled={statusLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-70 ${
            isActive
              ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
              : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          }`}
        >
          {statusLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isActive ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          {isActive ? 'Deactivate User' : 'Activate User'}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {(
            [
              { key: 'profile', label: 'Profile', icon: User },
              { key: 'addresses', label: 'Addresses', icon: MapPin },
              { key: 'orders', label: 'Orders', icon: Package },
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
                {tab.key === 'addresses' && user.addresses && (
                  <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {user.addresses.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="p-4 sm:p-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Full Name</p>
                <p className="font-semibold text-gray-900">{user.fullName}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-semibold text-gray-900 break-all flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {user.email}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {user.phone || '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Role</p>
                <p className="font-semibold text-gray-900 capitalize flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  {user.role}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Email Verified</p>
                <p className="font-semibold text-gray-900">
                  {user.isEmailVerified ? 'Yes' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-semibold text-gray-900">
                  {isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Member Since</p>
                <p className="font-semibold text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">User ID</p>
                <p className="font-mono text-xs text-gray-700 break-all">{user.id}</p>
              </div>
            </div>
          )}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              {(!user.addresses || user.addresses.length === 0) && (
                <div className="text-center py-10 text-gray-500">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No addresses found</p>
                  <p className="text-sm mt-1">This user has not added any addresses yet.</p>
                </div>
              )}
              {(user.addresses || []).map((addr) => (
                <div
                  key={addr.id}
                  className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 text-sm min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{addr.full_name}</p>
                        {addr.is_default && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">
                        {addr.street_address}
                        {addr.apartment ? `, ${addr.apartment}` : ''}
                      </p>
                      <p className="text-gray-600">
                        {[addr.city, addr.state, addr.zip_code].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-gray-600">{addr.country}</p>
                      {addr.phone && (
                        <p className="text-gray-500 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {addr.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openEditAddress(addr)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  {ordersPagination.total} order
                  {ordersPagination.total !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => setShowOrderFilters(!showOrderFilters)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
              <div
                className={`space-y-3 ${
                  showOrderFilters ? 'block' : 'hidden sm:block'
                }`}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchOrders(1);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search by Order ID..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
                  >
                    Search
                  </button>
                </form>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {PAYMENT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={orderStartDate}
                    onChange={(e) => setOrderStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="date"
                    value={orderEndDate}
                    onChange={(e) => setOrderEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {(orderStatusFilter ||
                  orderPaymentFilter ||
                  orderSearch ||
                  orderStartDate ||
                  orderEndDate) && (
                  <button
                    type="button"
                    onClick={clearOrderFilters}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {ordersLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No orders found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const cfg = getStatusConfig(order.status);
                    const StatusIcon = cfg.icon;
                    return (
                      <div
                        key={order.id}
                        className="border border-gray-100 rounded-xl p-4 bg-gray-50/50"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900">
                              Order #{order.id}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(order.createdAt)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {(order.items?.length || 0)} item
                              {(order.items?.length || 0) !== 1 ? 's' : ''} ·{' '}
                              <span className="font-medium text-gray-800">
                                {formatCurrency(order.total)}
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.bg} ${cfg.color}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-400 capitalize">
                              {order.paymentStatus} · {order.paymentMethod || '—'}
                            </span>
                            <Link
                              to="/orders"
                              className="text-xs text-purple-600 hover:text-purple-700 font-medium mt-1"
                            >
                              View in Orders →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {ordersPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => fetchOrders(ordersPagination.page - 1)}
                    disabled={ordersPagination.page <= 1 || ordersLoading}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {ordersPagination.page} of {ordersPagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchOrders(ordersPagination.page + 1)}
                    disabled={
                      ordersPagination.page >= ordersPagination.totalPages ||
                      ordersLoading
                    }
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {editAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Address</h3>
              <button
                onClick={() => setEditAddress(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={addressForm.full_name}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={addressForm.street_address}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, street_address: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Apartment / Suite
                </label>
                <input
                  type="text"
                  value={addressForm.apartment}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, apartment: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, state: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={addressForm.zip_code}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, zip_code: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  value={addressForm.country}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, country: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={addressForm.phone}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={(e) =>
                    setAddressForm((f) => ({ ...f, is_default: e.target.checked }))
                  }
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="is_default" className="text-sm text-gray-700">
                  Set as default address
                </label>
              </div>
            </div>
            {addressError && (
              <p className="text-sm text-red-600">{addressError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditAddress(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={addressSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-70 flex items-center gap-2"
              >
                {addressSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UserDetail;
