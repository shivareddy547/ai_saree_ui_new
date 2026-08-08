import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Heart,
  ChevronRight,
  Clock,
  Truck,
  Shield,
  Award,
  TrendingUp,
  Zap,
  Gift,
  Gem
} from 'lucide-react';
import axios from 'axios';
import HeroBanner from '../../components/HeroBanner';
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
interface CategoryApiItem {
  id: number;
  name: string;
  subtitle?: string;
  highlightText?: string;
  description?: string;
  imageUrl?: string;
  bgGradient?: string;
  badgeText?: string;
  badgeIcon?: string;
  order: number;
  isActive: boolean;
  showInHero: boolean;
  showInCategoryGrid: boolean;
  permalink?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  subCategories?: { id: number; name: string }[];
  createdAt?: string;
  updatedAt?: string;
}
interface Feature {
  icon: React.ElementType;
  label: string;
  desc: string;
}
const FeatureGrid: React.FC<{ features: Feature[] }> = ({ features }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {features.map((feature, index) => (
        <div key={index} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 text-center hover:shadow-md transition-shadow">
          <feature.icon className="w-6 h-6 text-purple-600 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 text-sm">{feature.label}</h3>
          <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
        </div>
      ))}
    </div>
  );
};
interface Category {
  id: number;
  name: string;
  icon: string;
  count: number;
  permalink?: string;
  link: string;
}
interface CategoryGridProps {
  categories: Category[];
  viewAllLink: string;
  title: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}
const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  viewAllLink,
  title,
  loading,
  error,
  onRetry,
}) => {
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-3 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }
  if (categories.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <Link to={viewAllLink} className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-500">No categories available</p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Link to={viewAllLink} className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link key={category.id} to={category.link} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 text-center hover:shadow-md transition-all group hover:-translate-y-1">
            <div className="text-3xl mb-2">{category.icon}</div>
            <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
            {category.count > 0 && <p className="text-xs text-gray-500">{category.count} items</p>}
          </Link>
        ))}
      </div>
    </div>
  );
};
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
interface ProductCardProps {
  product: Product;
  link: string;
}
const ProductCard: React.FC<ProductCardProps> = ({ product, link }) => {
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
      console.error('No variant available for product');
      return;
    }
    await addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
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
interface ProductGridProps {
  products: Product[];
  title: string;
  viewAllLink: string;
  productLinkPrefix: string;
}
const ProductGrid: React.FC<ProductGridProps> = ({ products, title, viewAllLink, productLinkPrefix }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Link to={viewAllLink} className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} link={`${productLinkPrefix}/${product.id}`} />
        ))}
      </div>
    </div>
  );
};
interface DealBannerProps {
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  buttonText: string;
  buttonLink: string;
  badgeText: string;
  bgGradient: string;
}
const DealBanner: React.FC<DealBannerProps> = ({
  title,
  description,
  price,
  originalPrice,
  buttonText,
  buttonLink,
  badgeText,
  bgGradient,
}) => {
  return (
    <div className={`${bgGradient} rounded-2xl p-6 md:p-8 border border-yellow-200 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🔥</div>
          <div>
            <span className="inline-block bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">{badgeText}</span>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-600 text-sm mt-1">{description}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-bold text-purple-600">₹{price}</span>
              <span className="text-sm text-gray-400 line-through">₹{originalPrice}</span>
            </div>
          </div>
        </div>
        <Link to={buttonLink} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all whitespace-nowrap">
          {buttonText}
        </Link>
      </div>
    </div>
  );
};
const StoreHome: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const response = await apiClient.get<CategoryApiItem[]>('/categories');
      const activeCategories = (response.data || [])
        .filter(cat => cat.isActive !== false && cat.showInCategoryGrid === true)
        .sort((a, b) => a.order - b.order)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.badgeIcon || '👗',
          count: Array.isArray(cat.subCategories) ? cat.subCategories.length : 0,
          permalink: cat.permalink,
          link: cat.primaryButtonLink || (cat.permalink ? `/store/products?category=${cat.permalink}` : '/store/products'),
        }));
      setCategories(activeCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategoriesError('Failed to load categories');
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const featuredRes = await apiClient.get('/store/products?featured=true');
      const featuredData = featuredRes.data.data;
      const featuredMapped = featuredData.map((p: any) => mapProduct(p));
      setFeaturedProducts(featuredMapped);
      const newRes = await apiClient.get('/store/products?newArrivals=true');
      const newData = newRes.data.data;
      const newMapped = newData.map((p: any) => mapProduct(p));
      setNewArrivals(newMapped);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setProductsLoading(false);
    }
  };
  const mapProduct = (apiProduct: any): Product => {
    const firstVariant = apiProduct.variants && apiProduct.variants.length > 0 ? apiProduct.variants[0] : null;
    const price = firstVariant ? parseFloat(firstVariant.price) : 0;
    const costPrice = firstVariant && firstVariant.costPrice ? parseFloat(firstVariant.costPrice) : null;
    const originalPrice = costPrice && costPrice > price ? costPrice : undefined;
    const image = apiProduct.images && apiProduct.images.length > 0 ? apiProduct.images[0].url : 'https://via.placeholder.com/300x400?text=No+Image';
    const colors = apiProduct.variants ? apiProduct.variants.map((v: any) => v.color).filter(Boolean) : [];
    const sizes = apiProduct.variants ? apiProduct.variants.map((v: any) => v.size).filter(Boolean) : [];
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
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);
  const features: Feature[] = [
    { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹999' },
    { icon: Shield, label: 'Secure Payment', desc: '100% secure transactions' },
    { icon: Clock, label: 'Easy Returns', desc: '30-day return policy' },
    { icon: Award, label: 'Quality Assured', desc: 'Premium quality products' },
  ];
  const dealData = {
    title: 'Premium Silk Saree Collection',
    description: 'Limited time offer - 50% off on select items',
    price: 1249,
    originalPrice: 2499,
    buttonText: 'Grab Now',
    buttonLink: '/store/product/1',
    badgeText: 'Deal of the Day',
    bgGradient: 'bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50',
  };
  const heroBannerConfig = {
    autoPlayInterval: 5000,
    showIndicators: true,
    showArrows: true,
    apiEndpoint: '/categories',
    fetchOnMount: true,
  };
  return (
    <div className="space-y-8">
      <HeroBanner {...heroBannerConfig} />
      <FeatureGrid features={features} />
      <CategoryGrid
        categories={categories}
        viewAllLink="/store/products"
        title="Shop by Category"
        loading={categoriesLoading}
        error={categoriesError}
        onRetry={fetchCategories}
      />
      {!productsLoading && featuredProducts.length > 0 && (
        <ProductGrid
          products={featuredProducts}
          title="Featured Products"
          viewAllLink="/store/products"
          productLinkPrefix="/store/product"
        />
      )}
      <DealBanner {...dealData} />
      {!productsLoading && newArrivals.length > 0 && (
        <ProductGrid
          products={newArrivals}
          title="New Arrivals"
          viewAllLink="/store/products"
          productLinkPrefix="/store/product"
        />
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'Best Sellers', color: 'from-yellow-400 to-orange-500' },
          { icon: Gift, label: 'Gift Ideas', color: 'from-pink-400 to-rose-500' },
          { icon: Gem, label: 'Premium Collection', color: 'from-purple-400 to-indigo-500' },
          { icon: TrendingUp, label: 'Trending Now', color: 'from-blue-400 to-cyan-500' },
        ].map((item, index) => (
          <Link key={index} to="/store/products" className={`bg-gradient-to-r ${item.color} p-4 rounded-xl text-white text-center hover:shadow-lg transition-all hover:scale-105`}>
            <item.icon className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
export default StoreHome;
