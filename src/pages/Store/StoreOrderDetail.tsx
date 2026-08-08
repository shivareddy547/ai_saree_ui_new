import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, MapPin, CreditCard } from 'lucide-react';
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
const StoreOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id]);
  const fetchOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
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
    return <div className="p-4 text-center">Loading order...</div>;
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
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/orders" className="text-gray-500 hover:text-purple-600">Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Order #{order.id}</span>
      </nav>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-purple-100 p-4 space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          {order.shippingAddress && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{order.shippingAddress}</span>
            </div>
          )}
          {order.paymentMethod && (
            <div className="flex items-center gap-2 text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>{order.paymentMethod}</span>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start gap-4 border-b border-gray-100 pb-3 last:border-0">
                <div className="w-16 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={item.product.images && item.product.images.length > 0 ? item.product.images[0].url : 'https://via.placeholder.com/64x80?text=No+Image'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.product.name}</p>
                  <div className="text-sm text-gray-500">
                    {item.variant.color && <span>Color: {item.variant.color}</span>}
                    {item.variant.size && <span> | Size: {item.variant.size}</span>}
                    <span> | Qty: {item.quantity}</span>
                  </div>
                  <div className="text-sm font-medium text-purple-600">₹{item.price * item.quantity}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4 flex justify-end">
          <div className="text-right">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-purple-600">₹{order.total}</div>
          </div>
        </div>
      </div>
      <Link to="/store/orders" className="text-purple-600 hover:underline inline-block">← Back to Orders</Link>
    </div>
  );
};
export default StoreOrderDetail;
