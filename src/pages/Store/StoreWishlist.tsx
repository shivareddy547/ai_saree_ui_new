import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Package } from 'lucide-react';
import axios from 'axios';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
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
// Product type for display (same as StoreProducts)
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  discount?: number;
  colors?: string[];
  sizes?: string[];
  variants: any[];
}
// ProductCard component matching StoreProducts
interface ProductCardProps {
  product: Product;
  link: string;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => Promise<void>;
  onRemoveFromList?: (productId: string) => void;
}
const ProductCard: React.FC<ProductCardProps> = ({ product, link, isWishlisted, onToggleWishlist, onRemoveFromList }) => {
  const { addToCart } = useCart();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setWishlisted(isWishlisted);
  }, [isWishlisted]);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const hasVariants = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const firstVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    if (!firstVariant) {
      alert('This product is not configured correctly. Please contact support.');
      return;
    }
    const price = product.price;
    if (typeof price !== 'number' || price <= 0) {
      alert('This product has an invalid price.');
      return;
    }
    await addToCart({
      id: product.id,
      name: product.name,
      price: price,
      image: product.image,
      variantId: firstVariant.id,
    });
  };
  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      await onToggleWishlist(product.id);
      setWishlisted(!wishlisted);
      // If removed from wishlist, call onRemoveFromList to update the parent list
      if (wishlisted && onRemoveFromList) {
        onRemoveFromList(product.id);
      }
    } catch (error) {
      console.error('Wishlist toggle failed:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Link to={link} className="group bg-white rounded-xl overflow-hidden shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors z-10"
          disabled={loading}
        >
          <Heart
            className={`w-4 h-4 ${wishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-400 hover:text-red-500'} transition-colors`}
          />
        </button>
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium text-gray-700">{product.rating}</span>
          <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-purple-600">₹{product.price}</span>
          {product.originalPrice && <span className="text-sm text-gray-400 line-through">₹{product.originalPrice}</span>}
        </div>
        <div className="mt-3">
          {hasVariants ? (
            <Link to={link} className="block w-full text-center bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors" onClick={(e) => e.stopPropagation()}>
              Select Options
            </Link>
          ) : (
            <button onClick={handleAddToCart} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};
const StoreWishlist: React.FC = () => {
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchWishlistCount, toggleWishlist } = useWishlist();
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
        await fetchWishlistCount();
      }
    } catch (err: any) {
      console.error('Failed to fetch wishlist:', err);
      setError(err.response?.data?.message || 'Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };
  // Map WishlistProduct to Product for ProductCard
  const mapToProduct = (wp: WishlistProduct): Product => {
    let price = wp.basePrice || 0;
    let originalPrice = wp.costPrice && wp.costPrice > price ? wp.costPrice : undefined;
    const image = wp.images && wp.images.length > 0 ? wp.images[0].url : 'https://via.placeholder.com/300x400?text=No+Image';
    let colors: string[] = [];
    let sizes: string[] = [];
    if (wp.variants && wp.variants.length > 0) {
      const firstVariant = wp.variants[0];
      const variantPrice = parseFloat(firstVariant.price);
      if (!isNaN(variantPrice) && variantPrice > 0) {
        price = variantPrice;
      }
      const costPrice = firstVariant.costPrice ? parseFloat(firstVariant.costPrice) : null;
      if (costPrice && costPrice > price) {
        originalPrice = costPrice;
      }
      colors = wp.variants.map((v: any) => v.color).filter(Boolean);
      sizes = wp.variants.map((v: any) => v.size).filter(Boolean);
    }
    return {
      id: wp.id,
      name: wp.name,
      price,
      originalPrice,
      rating: 4.5,
      reviews: 100,
      image,
      variants: wp.variants || [],
      colors,
      sizes,
    };
  };
  const handleToggleWishlist = async (productId: string) => {
    await toggleWishlist(productId);
    // The parent's list will be updated via onRemoveFromList callback when removed.
    // The local wishlisted state is toggled inside the ProductCard.
    // No need to return anything.
  };
  const handleRemoveFromList = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
  const productCards = products.map(wp => {
    const product = mapToProduct(wp);
    return (
      <ProductCard
        key={wp.id}
        product={product}
        link={`/store/product/${wp.id}`}
        isWishlisted={true}
        onToggleWishlist={handleToggleWishlist}
        onRemoveFromList={handleRemoveFromList}
      />
    );
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <span className="text-sm text-gray-500">{products.length} items</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {productCards}
      </div>
    </div>
  );
};
export default StoreWishlist;
