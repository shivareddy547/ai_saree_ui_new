import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, MapPin, CreditCard, Truck, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  product: {
    name: string;
    images?: { url: string }[];
  };
  variant: {
    color?: string;
    size?: string;
  };
}
interface Order {
  id: number;
  total: number;
  status: string;
  shippingAddress: string;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}
const StoreOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);
  const fetchOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch order:', err);
      setError(err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };
  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
      pending: {
        label: 'Pending',
        icon: Clock,
        color: 'text-yellow-700',
        bg: 'bg-yellow-50 border-yellow-200'
      },
      processing: {
        label: 'Processing',
        icon: AlertCircle,
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200'
      },
      shipped: {
        label: 'Shipped',
        icon: Truck,
        color: 'text-indigo-700',
        bg: 'bg-indigo-50 border-indigo-200'
      },
      delivered: {
        label: 'Delivered',
        icon: CheckCircle,
        color: 'text-green-700',
        bg: 'bg-green-50 border-green-200'
      },
      cancelled: {
        label: 'Cancelled',
        icon: XCircle,
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200'
      }
    };
    return statusMap[status] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      icon: Package,
      color: 'text-gray-700',
      bg: 'bg-gray-50 border-gray-200'
    };
  };
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-600">Error loading order</h2>
        <p className="text-red-600 mt-2">{error}</p>
        <Link to="/store/orders" className="text-purple-600 hover:underline mt-4 inline-block">Back to Orders</Link>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-600">Order not found</h2>
        <Link to="/store/orders" className="text-purple-600 hover:underline mt-2 inline-block">Back to Orders</Link>
      </div>
    );
  }
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/orders" className="text-gray-500 hover:text-purple-600">Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Order #{order.id}</span>
      </nav>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${statusConfig.bg} ${statusConfig.color}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="font-medium">{statusConfig.label}</span>
        </div>
      </div>
      {/* Order Summary Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-purple-100 p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 text-sm">
            <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <div className="text-gray-500">Order Date</div>
              <div className="font-medium text-gray-900">{new Date(order.createdAt).toLocaleString()}</div>
            </div>
          </div>
          {order.shippingAddress && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div>
                <div className="text-gray-500">Shipping Address</div>
                <div className="font-medium text-gray-900">{order.shippingAddress}</div>
              </div>
            </div>
          )}
          {order.paymentMethod && (
            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div>
                <div className="text-gray-500">Payment Method</div>
                <div className="font-medium text-gray-900">{order.paymentMethod}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Items Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-purple-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {order.items.map((item) => {
              const imageUrl = item.product.images && item.product.images.length > 0
                ? item.product.images[0].url
                : 'https://via.placeholder.com/80x100?text=No+Image';
              return (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-purple-50/50 transition-colors">
                  <div className="w-20 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x100?text=No+Image';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/store/product/${item.productId}`}
                      className="font-medium text-gray-900 hover:text-purple-600 transition-colors"
                    >
                      {item.product.name}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-2">
                      {item.variant.color && <span>Color: {item.variant.color}</span>}
                      {item.variant.size && <span>Size: {item.variant.size}</span>}
                      <span>Qty: {item.quantity}</span>
                    </div>
                    <div className="text-sm font-medium text-purple-600 mt-1">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 sm:text-right">
                    ₹{item.price} × {item.quantity}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Order Total */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-purple-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <span className="block">Total items: {order.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Amount</div>
            <div className="text-2xl font-bold text-purple-600">₹{order.total}</div>
          </div>
        </div>
      </div>
      <Link to="/store/orders" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span>Back to Orders</span>
      </Link>
    </div>
  );
};
export default StoreOrderDetail;
