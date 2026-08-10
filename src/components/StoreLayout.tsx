import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  Search, 
  User, 
  Heart,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  Home,
  Package,
  HelpCircle,
  Store,
  ChevronRight,
  XCircle
} from 'lucide-react';
import CartPopup from './CartPopup';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
interface Suggestion {
  id: string;
  name: string;
  image: string | null;
}
const StoreLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { totalItems } = useCart();
  const { wishlistCount } = useWishlist();
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);
  const userStr = localStorage.getItem('user');
  let userName = 'User';
  let userEmail = 'user@example.com';
  let userInitials = 'U';
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      userName = user.fullName || 'User';
      userEmail = user.email || 'user@example.com';
      userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    } catch (e) {
      // ignore
    }
  }
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);
  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionContainerRef.current && !suggestionContainerRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const response = await apiClient.get('/store/autocomplete', {
        params: { q: query.trim() }
      });
      if (response.data.success) {
        setSuggestions(response.data.data || []);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    navigate(`/store/product/${suggestion.id}`);
  };
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/store/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  const navItems = [
    { path: '/store/home', label: 'Home', icon: Home },
    { path: '/store/products', label: 'Products', icon: Package },
    { path: '/store/orders', label: 'Orders', icon: ShoppingBag },
    { path: '/store/cart', label: 'Cart', icon: ShoppingBag },
  ];
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('sessionId');
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/store/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                SareeStore
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              {/* Desktop Search */}
              <div className="hidden lg:block relative" ref={suggestionContainerRef}>
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="w-64 pl-9 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </form>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <ul className="py-2">
                      {suggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-3"
                          >
                            {suggestion.image ? (
                              <img src={suggestion.image} alt={suggestion.name} className="w-8 h-8 object-cover rounded" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <span className="text-sm text-gray-700">{suggestion.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {isLoadingSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-center text-sm text-gray-500">
                    Loading...
                  </div>
                )}
              </div>
              <Link
                to="/store/wishlist"
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Heart className="w-5 h-5 text-gray-600" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                to="/store/cart"
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                    {userInitials}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900">{userName}</p>
                      <p className="text-sm text-gray-500">{userEmail}</p>
                    </div>
                    <Link
                      to="/store/orders"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-gray-700"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Package className="w-4 h-4" />
                      <span className="text-sm">My Orders</span>
                    </Link>
                    <Link
                      to="/store/wishlist"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-gray-700"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">Wishlist</span>
                    </Link>
                    <Link
                      to="/store/settings"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-gray-700"
                      onClick={() => setShowProfileMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Settings</span>
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-red-600 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>
          {/* Mobile Search */}
          <div className="md:hidden pb-3 relative" ref={suggestionContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full pl-9 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <ul className="py-2">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <button
                        onClick={() => handleSuggestionSelect(suggestion)}
                        className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-3"
                      >
                        {suggestion.image ? (
                          <img src={suggestion.image} alt={suggestion.name} className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                        <span className="text-sm text-gray-700">{suggestion.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isLoadingSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-center text-sm text-gray-500">
                Loading...
              </div>
            )}
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-2">
            <div className="max-w-7xl mx-auto px-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-purple-50 text-purple-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.path === '/store/cart' && totalItems > 0 && (
                    <span className="ml-auto bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      {totalItems}
                    </span>
                  )}
                  {item.path === '/store/wishlist' && wishlistCount > 0 && (
                    <span className="ml-auto bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <Link
                  to="/help-us"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Help & Support</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <CartPopup />
      <footer className="bg-white/80 backdrop-blur-md border-t border-purple-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">SareeStore</h3>
              <p className="text-sm text-gray-600">Your trusted destination for premium sarees. Quality guaranteed.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/store/home" className="hover:text-purple-600 transition-colors">Home</Link></li>
                <li><Link to="/store/products" className="hover:text-purple-600 transition-colors">Products</Link></li>
                <li><Link to="/store/orders" className="hover:text-purple-600 transition-colors">Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/help-us" className="hover:text-purple-600 transition-colors">Help Center</Link></li>
                <li><Link to="/store/return-policy" className="hover:text-purple-600 transition-colors">Return Policy</Link></li>
                <li><Link to="/store/shipping" className="hover:text-purple-600 transition-colors">Shipping Info</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Email: support@sareestore.com</li>
                <li>Phone: +91 9876543210</li>
                <li>Mon-Sat: 10AM - 7PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            &copy; 2026 SareeStore. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
export default StoreLayout;
