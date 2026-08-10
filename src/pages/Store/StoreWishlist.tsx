import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Package } from 'lucide-react';
import axios from 'axios';
import { useWishlist } from '../../context/WishlistContext';
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
interface WishlistProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  costPrice?: number;
  images: { id: string; url: string; position: number }[];
  variants?: any[];
  category?: any;
}
const StoreWishlist: React.FC = () => {
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchWishlistCount } = useWishlist();
  useEffect(() => {
    fetchWishlist();
  }, []);
  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/store/wishlist');
      if (response.data.success) {
        setProducts(response.data.data);
        await fetchWishlistCount(); // update count
      }
    } catch (err: any) {
      console.error('Failed to fetch wishlist:', err);
      setError(err.response?.data?.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
            <div className="aspect-[3/4] bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={fetchWishlist}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
        <p className="text-gray-500 mb-6">Start adding items you love to your wishlist.</p>
        <Link
          to="/store/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow"
        >
          <ShoppingBag className="w-5 h-5" />
          Browse Products
        </Link>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <span className="text-sm text-gray-500">{products.length} items</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const imageUrl = product.images && product.images.length > 0
            ? product.images[0].url
            : 'https://via.placeholder.com/300x400?text=No+Image';
          const price = product.basePrice || 0;
          const originalPrice = product.costPrice && product.costPrice > price
            ? product.costPrice
            : undefined;
          const discount = originalPrice
            ? Math.round(((originalPrice - price) / originalPrice) * 100)
            : 0;
          return (
            <Link
              key={product.id}
              to={`/store/product/${product.id}`}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {discount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {discount}% OFF
                  </span>
                )}
              </div>
              <div className="p-3">
                {product.category && (
                  <p className="text-xs text-purple-600 font-medium mb-1">
                    {product.category.name}
                  </p>
                )}
                <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-purple-600">₹{price}</span>
                  {originalPrice && (
                    <span className="text-sm text-gray-400 line-through">₹{originalPrice}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-gray-600">4.5</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // Maybe toggle wishlist from here? For now, navigate to product detail.
                    }}
                    className="text-pink-500 hover:text-pink-600 transition-colors"
                  >
                    <Heart className="w-4 h-4 fill-pink-500" />
                  </button>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
export default StoreWishlist;
