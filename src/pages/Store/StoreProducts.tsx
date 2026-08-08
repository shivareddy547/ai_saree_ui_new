import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Grid, List, Filter, Star, Heart, ChevronRight } from 'lucide-react';
import axios from 'axios';
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
const ProductCard: React.FC<{ product: Product; link: string }> = ({ product, link }) => {
  const { addToCart } = useCart();
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
    // Use product.price (computed from basePrice or variant) instead of firstVariant.price directly
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
  return (
    <Link to={link} className="group bg-white rounded-xl overflow-hidden shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors">
          <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
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
const StoreProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  useEffect(() => {
    fetchProducts();
  }, []);
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/store/products');
      const data = response.data.data;
      const mapped = data.map((p: any) => mapProduct(p));
      setProducts(mapped);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };
  const mapProduct = (apiProduct: any): Product => {
    let price = 0;
    let originalPrice = undefined;
    let colors: string[] = [];
    let sizes: string[] = [];
    if (apiProduct.variants && apiProduct.variants.length > 0) {
      const firstVariant = apiProduct.variants[0];
      const variantPrice = parseFloat(firstVariant.price);
      if (!isNaN(variantPrice) && variantPrice > 0) {
        price = variantPrice;
      } else {
        price = apiProduct.basePrice ? parseFloat(apiProduct.basePrice) : 0;
      }
      const costPrice = firstVariant.costPrice ? parseFloat(firstVariant.costPrice) : null;
      if (costPrice && costPrice > price) {
        originalPrice = costPrice;
      }
      colors = apiProduct.variants.map((v: any) => v.color).filter(Boolean);
      sizes = apiProduct.variants.map((v: any) => v.size).filter(Boolean);
    } else {
      price = apiProduct.basePrice ? parseFloat(apiProduct.basePrice) : 0;
    }
    const image = apiProduct.images && apiProduct.images.length > 0 ? apiProduct.images[0].url : 'https://via.placeholder.com/300x400?text=No+Image';
    return {
      id: apiProduct.id,
      name: apiProduct.name,
      price,
      originalPrice,
      rating: 4.5,
      reviews: 100,
      image,
      variants: apiProduct.variants || [],
      colors,
      sizes,
    };
  };
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white/80 rounded-xl shadow-sm border border-purple-100 h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Products</span>
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm w-48 sm:w-64"
            />
          </div>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'} transition-colors`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'} transition-colors border-l border-gray-200`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} link={`/store/product/${product.id}`} />
          ))}
        </div>
      )}
    </div>
  );
};
export default StoreProducts;
