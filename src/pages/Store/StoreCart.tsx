import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ChevronRight, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
const StoreCart: React.FC = () => {
  const { items, fetchCart, updateQuantity, removeFromCart, totalPrice, mergeGuestCart } = useCart();
  const navigate = useNavigate();
  useEffect(() => {
    // On cart page load: if logged in, merge any guest items then refresh
    const init = async () => {
      if (localStorage.getItem('authToken')) {
        await mergeGuestCart();
      }
      await fetchCart();
    };
    init();
  }, [fetchCart, mergeGuestCart]);
  const subtotal = totalPrice;
  const shipping = subtotal > 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.12);
  const total = subtotal + shipping + tax;
  const handleCheckoutClick = () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/store/checkout');
    } else {
      // After login, user should return to cart so items can be merged
      navigate('/login', { state: { from: '/store/cart' } });
    }
  };
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/store/home" className="text-gray-500 hover:text-purple-600">
            Store
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-900 font-medium">Shopping Cart</span>
        </nav>
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-600">Your cart is empty</h2>
          <p className="text-gray-400 mt-2">Start shopping to add items to your cart</p>
          <Link
            to="/store/products"
            className="inline-flex items-center gap-2 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            Continue Shopping <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
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
        <span className="text-gray-900 font-medium">Shopping Cart</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-full sm:w-24 h-32 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    {item.color && <p className="text-sm text-gray-500">Color: {item.color}</p>}
                    {item.size && <p className="text-sm text-gray-500">Size: {item.size}</p>}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-purple-600">₹{item.price * item.quantity}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-lg bg-white/80 backdrop-blur-sm">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-gray-50 transition-colors text-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1 font-medium text-gray-900 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-gray-50 transition-colors text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                  <span className="text-sm font-medium text-green-600">In Stock</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
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
              {shipping > 0 && (
                <p className="text-xs text-gray-500">Add ₹{999 - subtotal} more for free shipping</p>
              )}
            </div>
            <button
              onClick={handleCheckoutClick}
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ChevronRight className="w-4 h-4" />
            </button>
            <Link
              to="/store/products"
              className="w-full mt-3 text-center text-sm text-purple-600 hover:text-purple-700 block"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default StoreCart;
