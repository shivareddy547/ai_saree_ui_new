import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock } from 'lucide-react';
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
  product: { name: string; images?: { url: string }[] };
  variant: { color?: string; size?: string };
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/80 p-4 rounded-xl shadow-sm border border-purple-100 animate-pulse">
              <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
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
          <span className="text-gray-900 font-medium">My Orders</span>
        </nav>
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-600">No orders yet</h2>
          <p className="text-gray-400 mt-2">Start shopping to place your first order</p>
          <Link to="/store/products" className="inline-flex items-center gap-2 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all">
            Browse Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">My Orders</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-purple-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">Order #{order.id}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>₹{order.total}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">{order.items.length} item(s)</div>
              </div>
              <Link to={`/store/order/${order.id}`} className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1">
                View Details <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default StoreOrders;
