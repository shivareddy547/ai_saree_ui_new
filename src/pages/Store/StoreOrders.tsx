import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, ShoppingBag, Truck, CheckCircle, XCircle, AlertCircle, MapPin } from 'lucide-react';
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
  // Shipment fields
  shipmentProviderId?: string | null;
  courierName?: string | null;
  shipmentDetails?: Record<string, any> | null;
}
const StoreOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchOrders();
  }, []);
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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
  const isStorePickup = (order: Order): boolean => {
    if (!order.courierName) return false;
    return order.courierName.toLowerCase().includes('store pickup');
  };
  const getStorePickupLocation = (order: Order): { name: string; address: string } | null => {
    if (!isStorePickup(order)) return null;
    const details = order.shipmentDetails;
    if (details) {
      // Try to extract from shipmentDetails.store_pickup or any key
      for (const key of Object.keys(details)) {
        const entry = details[key];
        if (entry && typeof entry === 'object' && entry.type === 'store_pickup') {
          return {
            name: entry.pickupLocationName || order.courierName || 'Store',
            address: entry.pickupLocationAddress || ''
          };
        }
      }
    }
    // Fallback: use courierName as location name
    return {
      name: order.courierName || 'Store Pickup',
      address: ''
    };
  };
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-48 bg-gray-200 rounded" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="flex gap-3">
                    <div className="h-16 w-16 bg-gray-200 rounded" />
                    <div className="h-16 w-16 bg-gray-200 rounded" />
                    <div className="h-16 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="h-8 w-24 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Your Orders</span>
        </nav>
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-700">No orders yet</h2>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">Looks like you haven't placed any orders. Start shopping to see your order history here.</p>
          <Link to="/store/products" className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all">
            <ShoppingBag className="w-5 h-5" />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Your Orders</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your Orders</h1>
        <span className="text-sm text-gray-500">{orders.length} order{orders.length > 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-4">
        {orders.map((order) => {
          const statusConfig = getStatusConfig(order.status);
          const StatusIcon = statusConfig.icon;
          const displayItems = order.items.slice(0, 4);
          const remainingCount = order.items.length - 4;
          const pickup = getStorePickupLocation(order);
          return (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Order placed</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-gray-200" />
                  <div>
                    <span className="text-gray-500">Total</span>
                    <span className="ml-2 font-medium text-gray-900">₹{order.total}</span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-gray-200" />
                  <div>
                    <span className="text-gray-500">Order #</span>
                    <span className="ml-2 font-medium text-gray-900">{order.id}</span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.color} text-sm`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="font-medium">{statusConfig.label}</span>
                </div>
              </div>
              {/* Order Items */}
              <div className="px-4 sm:px-6 py-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex flex-wrap gap-2">
                    {displayItems.map((item, idx) => {
                      const imageUrl = item.product.images && item.product.images.length > 0
                        ? item.product.images[0].url
                        : null;
                      return (
                        <div key={idx} className="relative">
                          <div className="w-16 h-20 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.product.name}
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
                          {item.quantity > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {remainingCount > 0 && (
                      <div className="w-16 h-20 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-sm text-gray-600 font-medium">
                        +{remainingCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-sm text-gray-500">
                      <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                      {pickup && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-green-700">
                          <MapPin className="w-3 h-3" />
                          <span>Pickup: {pickup.name}</span>
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/store/order/${order.id}`}
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium text-sm whitespace-nowrap"
                    >
                      View Order Details
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default StoreOrders;
