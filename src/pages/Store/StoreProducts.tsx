import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Grid, List, Filter, Star, Heart, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
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
  categoryId?: number | null;
  subcategoryId?: number | null;
  basePrice?: number;
}

interface Category {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
}

interface ProductCardProps {
  product: Product;
  link: string;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  viewMode: 'grid' | 'list';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, link, isWishlisted, onToggleWishlist, viewMode }) => {
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

    // Resolve a valid price: prefer mapped product.price, then variant.price, then basePrice
    let price = product.price;
    if (typeof price !== 'number' || price <= 0) {
      const variantPrice = parseFloat(firstVariant.price);
      if (!isNaN(variantPrice) && variantPrice > 0) {
        price = variantPrice;
      } else if (product.basePrice && product.basePrice > 0) {
        price = product.basePrice;
      }
    }

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
    } catch (error) {
      console.error('Wishlist toggle failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <Link to={link} className="group bg-white rounded-xl overflow-hidden shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-48 md:w-56 flex-shrink-0 aspect-[3/4] sm:aspect-auto sm:h-auto overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <button
            onClick={handleWishlistClick}
            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors z-10"
            disabled={loading}
          >
            <Heart className={`w-4 h-4 ${wishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-400 hover:text-red-500'} transition-colors`} />
          </button>
          {discount > 0 && (
            <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
              {discount}% OFF
            </span>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium text-gray-700">{product.rating}</span>
              <span className="text-xs text-gray-500">({product.reviews})</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-purple-600">₹{product.price}</span>
              {product.originalPrice && <span className="text-sm text-gray-400 line-through">₹{product.originalPrice}</span>}
            </div>
          </div>
          <div className="mt-auto">
            {hasVariants ? (
              <Link to={link} className="inline-block text-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors" onClick={(e) => e.stopPropagation()}>
                Select Options
              </Link>
            ) : (
              <button onClick={handleAddToCart} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                Add to Cart
              </button>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={link} className="group bg-white rounded-xl overflow-hidden shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors z-10"
          disabled={loading}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-400 hover:text-red-500'} transition-colors`} />
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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

const DualRangeSlider: React.FC<{
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (minVal: number, maxVal: number) => void;
  step?: number;
}> = ({ min, max, valueMin, valueMax, onChange, step = 50 }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);

  useEffect(() => {
    if (!dragging) {
      setLocalMin(valueMin);
      setLocalMax(valueMax);
    }
  }, [valueMin, valueMax, dragging]);

  const safeMin = Math.max(min, Math.min(localMin, localMax - step));
  const safeMax = Math.min(max, Math.max(localMax, localMin + step));

  const getPercent = (value: number) => {
    if (max <= min) return 0;
    return ((value - min) / (max - min)) * 100;
  };

  const percentMin = getPercent(safeMin);
  const percentMax = getPercent(safeMax);

  const valueFromClientX = (clientX: number) => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + percent * (max - min);
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const handlePointerDown = (thumb: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(thumb);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const newValue = valueFromClientX(e.clientX);
    if (dragging === 'min') {
      const clamped = Math.min(newValue, safeMax - step);
      setLocalMin(clamped);
    } else {
      const clamped = Math.max(newValue, safeMin + step);
      setLocalMax(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    onChange(safeMin, safeMax);
    setDragging(null);
  };

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (dragging) return;
    if ((e.target as HTMLElement).dataset.thumb) return;
    const newValue = valueFromClientX(e.clientX);
    const distToMin = Math.abs(newValue - safeMin);
    const distToMax = Math.abs(newValue - safeMax);
    if (distToMin <= distToMax) {
      const clamped = Math.min(newValue, safeMax - step);
      setLocalMin(clamped);
      onChange(clamped, safeMax);
    } else {
      const clamped = Math.max(newValue, safeMin + step);
      setLocalMax(clamped);
      onChange(safeMin, clamped);
    }
  };

  return (
    <div className="w-full select-none py-4">
      <div
        ref={trackRef}
        className="relative h-2 bg-gray-200 rounded-full cursor-pointer touch-none"
        onPointerDown={handleTrackPointerDown}
      >
        <div
          className="absolute h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full pointer-events-none"
          style={{
            left: `${percentMin}%`,
            width: `${Math.max(0, percentMax - percentMin)}%`,
          }}
        />
        <div
          data-thumb="min"
          className={`absolute top-1/2 w-5 h-5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white border-[3px] border-purple-600 shadow-md cursor-grab active:cursor-grabbing touch-none transition-transform ${
            dragging === 'min' ? 'scale-125 z-30' : 'hover:scale-110 z-20'
          }`}
          style={{ left: `${percentMin}%` }}
          onPointerDown={handlePointerDown('min')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div
          data-thumb="max"
          className={`absolute top-1/2 w-5 h-5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white border-[3px] border-pink-500 shadow-md cursor-grab active:cursor-grabbing touch-none transition-transform ${
            dragging === 'max' ? 'scale-125 z-30' : 'hover:scale-110 z-20'
          }`}
          style={{ left: `${percentMax}%` }}
          onPointerDown={handlePointerDown('max')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      <div className="flex justify-between mt-4 text-xs font-medium">
        <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md">
          ₹{safeMin.toLocaleString('en-IN')}
        </span>
        <span className="bg-pink-50 text-pink-700 px-2.5 py-1 rounded-md">
          ₹{safeMax.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
};

const StoreProducts: React.FC = () => {
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const { toggleWishlist } = useWishlist();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [globalMaxPrice, setGlobalMaxPrice] = useState<number>(50000);
  const [priceInitialized, setPriceInitialized] = useState(false);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || '';
    const cat = params.get('categoryId') || '';
    const subcat = params.get('subcategoryId') || '';
    const minP = params.get('minPrice');
    const maxP = params.get('maxPrice');
    const sort = params.get('sortBy') || 'newest';
    setSearchTerm(searchParam);
    setSelectedCategoryId(cat);
    setSelectedSubcategoryId(subcat);
    if (minP !== null && minP !== '') setMinPrice(Number(minP));
    if (maxP !== null && maxP !== '') setMaxPrice(Number(maxP));
    setSortBy(sort);
  }, [location.search]);

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await apiClient.get('/categories');
        const cats = (response.data || []).map((cat: any) => ({
          id: String(cat.id),
          name: cat.name,
          subcategories: (cat.subCategories || cat.subcategories || []).map((sub: any) => ({
            id: String(sub.id),
            name: sub.name,
          })),
        }));
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchPriceBounds = async () => {
      try {
        const response = await apiClient.get('/store/products', { params: { sortBy: 'price_desc' } });
        const data = response.data.data || [];
        let highest = 0;
        data.forEach((p: any) => {
          let price = 0;
          if (p.variants && p.variants.length > 0) {
            const prices = p.variants
              .map((v: any) => parseFloat(v.price))
              .filter((pr: number) => !isNaN(pr) && pr > 0);
            if (prices.length > 0) price = Math.max(...prices);
          }
          if (!price && p.basePrice) price = parseFloat(p.basePrice) || 0;
          if (price > highest) highest = price;
        });
        const roundedMax = Math.max(Math.ceil(highest / 500) * 500, 1000);
        setGlobalMaxPrice(roundedMax);
        setMinPrice((prev) => (prev === 0 ? 0 : prev));
        setMaxPrice((prev) => (prev === 0 || prev > roundedMax ? roundedMax : prev));
        setPriceInitialized(true);
      } catch (err) {
        console.error('Failed to fetch price bounds:', err);
        setGlobalMaxPrice(50000);
        setMaxPrice(50000);
        setPriceInitialized(true);
      }
    };
    fetchPriceBounds();
  }, []);

  const updateUrlParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(location.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      const newUrl = `${location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    },
    [location.pathname, location.search]
  );

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      if (selectedSubcategoryId) params.subcategoryId = selectedSubcategoryId;
      if (minPrice > 0) params.minPrice = minPrice;
      if (maxPrice > 0 && maxPrice < globalMaxPrice) params.maxPrice = maxPrice;
      if (sortBy) params.sortBy = sortBy;

      const response = await apiClient.get('/store/products', { params });
      const data = response.data.data || [];
      const mapped = data.map((p: any) => mapProduct(p));
      setProducts(mapped);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategoryId, selectedSubcategoryId, minPrice, maxPrice, sortBy, globalMaxPrice]);

  useEffect(() => {
    if (priceInitialized) {
      fetchProducts();
    }
    fetchWishlist();
  }, [fetchProducts, priceInitialized]);

  const fetchWishlist = async () => {
    try {
      const response = await apiClient.get('/store/wishlist');
      if (response.data.success) {
        const ids = response.data.data.map((p: any) => p.id);
        setWishlistedIds(new Set(ids));
      }
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setWishlistedIds(new Set());
    }
  };

  const mapProduct = (apiProduct: any): Product => {
    let price = 0;
    let originalPrice = undefined;
    let colors: string[] = [];
    let sizes: string[] = [];
    const basePriceNum = apiProduct.basePrice ? parseFloat(apiProduct.basePrice) : 0;

    if (apiProduct.variants && apiProduct.variants.length > 0) {
      // Prefer the lowest positive variant price
      const variantPrices = apiProduct.variants
        .map((v: any) => parseFloat(v.price))
        .filter((pr: number) => !isNaN(pr) && pr > 0);

      if (variantPrices.length > 0) {
        price = Math.min(...variantPrices);
      } else {
        // All variants have 0 / invalid price → fall back to basePrice
        price = basePriceNum > 0 ? basePriceNum : 0;
      }

      const firstVariant = apiProduct.variants[0];
      const costPrice = firstVariant.costPrice ? parseFloat(firstVariant.costPrice) : null;
      if (costPrice && costPrice > price) {
        originalPrice = costPrice;
      }

      colors = apiProduct.variants.map((v: any) => v.color).filter(Boolean);
      sizes = apiProduct.variants.map((v: any) => v.size).filter(Boolean);
    } else {
      price = basePriceNum > 0 ? basePriceNum : 0;
    }

    const image =
      apiProduct.images && apiProduct.images.length > 0
        ? apiProduct.images[0].url
        : 'https://via.placeholder.com/300x400?text=No+Image';

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
      categoryId: apiProduct.categoryId,
      subcategoryId: apiProduct.subcategoryId,
      basePrice: basePriceNum,
    };
  };

  const handleToggleWishlist = async (productId: string) => {
    const result = await toggleWishlist(productId);
    setWishlistedIds((prev) => {
      const newSet = new Set(prev);
      if (result.isWishlisted) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    updateUrlParams({ search: value });
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedSubcategoryId('');
    updateUrlParams({ categoryId: catId, subcategoryId: '' });
  };

  const handleSubcategoryChange = (subId: string) => {
    setSelectedSubcategoryId(subId);
    updateUrlParams({ subcategoryId: subId });
  };

  const handlePriceRangeChange = (newMin: number, newMax: number) => {
    setMinPrice(newMin);
    setMaxPrice(newMax);
    updateUrlParams({
      minPrice: newMin > 0 ? String(newMin) : '',
      maxPrice: newMax < globalMaxPrice ? String(newMax) : '',
    });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateUrlParams({ sortBy: value });
  };

  const clearAllFilters = () => {
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    setMinPrice(0);
    setMaxPrice(globalMaxPrice);
    setSortBy('newest');
    setSearchTerm('');
    window.history.replaceState({}, '', `${location.pathname}`);
  };

  const hasActiveFilters =
    selectedCategoryId ||
    selectedSubcategoryId ||
    minPrice > 0 ||
    (maxPrice > 0 && maxPrice < globalMaxPrice) ||
    (sortBy && sortBy !== 'newest') ||
    searchTerm;

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const FilterPanel = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`bg-white rounded-xl border border-purple-100 shadow-sm ${isMobile ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-purple-600" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="text-xs text-purple-600 hover:text-purple-800 font-medium">
            Clear all
          </button>
        )}
      </div>

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
        {categoriesLoading ? (
          <div className="h-8 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => handleCategoryChange('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !selectedCategoryId ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategoryId === cat.id ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCategory && selectedCategory.subcategories.length > 0 && (
        <div className="mb-5">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Subcategory</h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            <button
              onClick={() => handleSubcategoryChange('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !selectedSubcategoryId ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Subcategories
            </button>
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSubcategoryChange(sub.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedSubcategoryId === sub.id ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-5">
        <h4 className="text-sm font-medium text-gray-700 mb-1">Price Range (₹)</h4>
        {priceInitialized ? (
          <DualRangeSlider
            min={0}
            max={globalMaxPrice}
            valueMin={minPrice}
            valueMax={maxPrice || globalMaxPrice}
            onChange={handlePriceRangeChange}
            step={Math.max(50, Math.floor(globalMaxPrice / 100))}
          />
        ) : (
          <div className="h-14 bg-gray-100 rounded animate-pulse mt-2" />
        )}
        <div className="flex justify-between text-[11px] text-gray-400 mt-1 px-0.5">
          <span>₹0</span>
          <span>₹{globalMaxPrice.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div className="mb-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Sort By</h4>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full appearance-none px-3 py-2.5 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );

  if (loading && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/80 rounded-xl shadow-sm border border-purple-100 h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">
          Store
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">Products</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm w-full sm:w-64"
            />
          </div>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'} transition-colors`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-600'} transition-colors border-l border-gray-200`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Mobile filter button removed from here — now sticky at bottom */}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              Search: {searchTerm}
              <button
                onClick={() => {
                  setSearchTerm('');
                  updateUrlParams({ search: '' });
                }}
                className="hover:text-purple-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCategoryId && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              {categories.find((c) => c.id === selectedCategoryId)?.name || 'Category'}
              <button onClick={() => handleCategoryChange('')} className="hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedSubcategoryId && selectedCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              {selectedCategory.subcategories.find((s) => s.id === selectedSubcategoryId)?.name || 'Subcategory'}
              <button onClick={() => handleSubcategoryChange('')} className="hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {(minPrice > 0 || (maxPrice > 0 && maxPrice < globalMaxPrice)) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              ₹{minPrice.toLocaleString('en-IN')} – ₹{(maxPrice || globalMaxPrice).toLocaleString('en-IN')}
              <button onClick={() => handlePriceRangeChange(0, globalMaxPrice)} className="hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sortBy && sortBy !== 'newest' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
              <button onClick={() => handleSortChange('newest')} className="hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-6">
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {products.length} product{products.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
              <p className="text-gray-500 mb-3">No products found</p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-sm text-purple-600 hover:text-purple-800 font-medium">
                  Clear all filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  link={`/store/product/${product.id}`}
                  isWishlisted={wishlistedIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                  viewMode="grid"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  link={`/store/product/${product.id}`}
                  isWishlisted={wishlistedIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                  viewMode="list"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="font-semibold text-gray-900">Filters & Sort</h3>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <FilterPanel isMobile />
              <button
                onClick={() => setIsFilterOpen(false)}
                className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Show {products.length} Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Filter Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex items-center justify-between z-40">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-yellow-400 ml-1" />}
        </button>
        <div className="text-sm text-gray-500">
          {products.length} products
        </div>
      </div>
    </div>
  );
};

export default StoreProducts;
