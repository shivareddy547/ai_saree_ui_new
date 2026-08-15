import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import axios from 'axios';
import { CheckCircle, ArrowRight, Shield, Truck, CreditCard, ShoppingBag } from 'lucide-react';
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
const StoreCheckout: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, fetchCart, mergeGuestCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { state: { from: '/store/checkout' } });
      return;
    }
    const init = async () => {
      setInitLoading(true);
      try {
        // Ensure guest items are merged into server cart before placing order
        await mergeGuestCart();
        await fetchCart();
      } finally {
        setInitLoading(false);
      }
    };
    init();
  }, [fetchCart, mergeGuestCart, navigate]);
  const subtotal = totalPrice;
  const shipping = subtotal > 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipping + tax;
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress.trim()) {
      alert('Please enter a shipping address');
      return;
    }
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }
    setLoading(true);
    try {
      // Final merge attempt in case items were only in guest storage
      await mergeGuestCart();
      const response = await apiClient.post('/orders', {
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
      });
      setOrderId(response.data.data.id);
      setOrderPlaced(true);
      await clearCart();
      await fetchCart();
      setTimeout(() => {
        navigate('/store/orders');
      }, 3000);
    } catch (error: any) {
      console.error('Order placement failed:', error);
      alert(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  if (orderPlaced) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-green-100">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>
        <p className="text-gray-600 mt-2">Your order #{orderId} has been placed successfully.</p>
        <p className="text-sm text-gray-500 mt-1">Redirecting to your orders...</p>
      </div>
    );
  }
  if (initLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading checkout...</p>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-600">Your cart is empty</h2>
        <Link to="/store/products" className="text-purple-600 hover:underline mt-2 inline-block">
          Continue Shopping
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">
          Store
        </Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/cart" className="text-gray-500 hover:text-purple-600">
          Cart
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Checkout</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form
            onSubmit={handlePlaceOrder}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 space-y-6"
          >
            <div>
              <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Address
              </label>
              <textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter your full shipping address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Cash on Delivery</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Online"
                    checked={paymentMethod === 'Online'}
                    onChange={() => setPaymentMethod('Online')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Online Payment (UPI/Card)</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-gray-600">
                  <span className="truncate mr-2">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="flex-shrink-0">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className={shipping === 0 ? 'text-green-600' : 'text-gray-600'}>
                  {shipping === 0 ? 'Free' : `₹${shipping}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (12%)</span>
                <span>₹{tax}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-purple-600">₹{total}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Secure checkout</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <Truck className="w-4 h-4" />
              <span>Free shipping on orders above ₹999</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default StoreCheckout;
