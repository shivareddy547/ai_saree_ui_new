import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  Star, 
  Heart,
  ChevronRight,
  Clock,
  Truck,
  Shield,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
  Gift,
  Gem
} from 'lucide-react';
import HeroBanner, { Banner } from '../../components/HeroBanner';
// ===== COMPONENT: FeatureGrid =====
interface Feature {
  icon: React.ElementType;
  label: string;
  desc: string;
}
interface FeatureGridProps {
  features: Feature[];
}
const FeatureGrid: React.FC<FeatureGridProps> = ({ features }) => {
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
// ===== COMPONENT: CategoryGrid =====
interface Category {
  name: string;
  icon: string;
  count: number;
  color?: string;
}
interface CategoryGridProps {
  categories: Category[];
  viewAllLink: string;
  title: string;
}
const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, viewAllLink, title }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Link to={viewAllLink} className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.name}
            to={viewAllLink}
            className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 text-center hover:shadow-md transition-all group hover:-translate-y-1"
          >
            <div className="text-3xl mb-2">{category.icon}</div>
            <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
            <p className="text-xs text-gray-500">{category.count} items</p>
          </Link>
        ))}
      </div>
    </div>
  );
};
// ===== COMPONENT: ProductCard =====
interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  discount?: number;
}
interface ProductCardProps {
  product: Product;
  link: string;
}
const ProductCard: React.FC<ProductCardProps> = ({ product, link }) => {
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  return (
    <Link
      to={link}
      className="group bg-white rounded-xl overflow-hidden shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors">
          <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
        </button>
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium text-gray-700">{product.rating}</span>
          <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-purple-600">₹{product.price}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">₹{product.originalPrice}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
// ===== COMPONENT: ProductGrid =====
interface ProductGridProps {
  products: Product[];
  title: string;
  viewAllLink: string;
  productLinkPrefix: string;
}
const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  title, 
  viewAllLink, 
  productLinkPrefix 
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Link to={viewAllLink} className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            link={`${productLinkPrefix}/${product.id}`}
          />
        ))}
      </div>
    </div>
  );
};
// ===== COMPONENT: DealBanner =====
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
            <span className="inline-block bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {badgeText}
            </span>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-600 text-sm mt-1">{description}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-bold text-purple-600">₹{price}</span>
              <span className="text-sm text-gray-400 line-through">₹{originalPrice}</span>
            </div>
          </div>
        </div>
        <Link
          to={buttonLink}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all whitespace-nowrap"
        >
          {buttonText}
        </Link>
      </div>
    </div>
  );
};
// ===== MAIN PAGE =====
const StoreHome: React.FC = () => {
  // Data configurations
  const features: Feature[] = [
    { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹999' },
    { icon: Shield, label: 'Secure Payment', desc: '100% secure transactions' },
    { icon: Clock, label: 'Easy Returns', desc: '30-day return policy' },
    { icon: Award, label: 'Quality Assured', desc: 'Premium quality products' },
  ];
  const categories: Category[] = [
    { name: 'Silk Sarees', icon: '👗', count: 45 },
    { name: 'Cotton Sarees', icon: '👘', count: 32 },
    { name: 'Designer Sarees', icon: '✨', count: 28 },
    { name: 'Party Wear', icon: '💃', count: 19 },
    { name: 'Daily Wear', icon: '🛍️', count: 56 },
    { name: 'Wedding Collection', icon: '💒', count: 23 },
  ];
  const featuredProducts: Product[] = [
    { id: 1, name: 'Designer Silk Saree', price: 2499, originalPrice: 3499, rating: 4.8, reviews: 120, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 2, name: 'Banarasi Silk Saree', price: 3599, originalPrice: 4599, rating: 4.9, reviews: 85, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 3, name: 'Cotton Saree', price: 999, originalPrice: 1499, rating: 4.6, reviews: 200, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 4, name: 'Party Wear Saree', price: 1899, originalPrice: 2599, rating: 4.7, reviews: 150, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
  ];
  const newArrivals: Product[] = [
    { id: 5, name: 'New Silk Saree', price: 2999, originalPrice: 3999, rating: 4.9, reviews: 45, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 6, name: 'Designer Cotton Saree', price: 1499, originalPrice: 1999, rating: 4.7, reviews: 78, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 7, name: 'Party Wear Saree', price: 2199, originalPrice: 2899, rating: 4.8, reviews: 92, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 8, name: 'Wedding Collection', price: 4599, originalPrice: 5999, rating: 4.9, reviews: 112, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
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
  // HeroBanner configuration
  const heroBannerConfig = {
    autoPlayInterval: 5000,
    showIndicators: true,
    showArrows: true,
    apiEndpoint: '/api/banners',
    fetchOnMount: true,
  };
  return (
    <div className="space-y-8">
      {/* 1. Hero Banner Section - Carousel with API integration */}
      <HeroBanner {...heroBannerConfig} />
      {/* 2. Features Section */}
      <FeatureGrid features={features} />
      {/* 3. Shop by Category Section */}
      <CategoryGrid 
        categories={categories} 
        viewAllLink="/store/products" 
        title="Shop by Category"
      />
      {/* 4. Featured Products Section */}
      <ProductGrid 
        products={featuredProducts}
        title="Featured Products"
        viewAllLink="/store/products"
        productLinkPrefix="/store/product"
      />
      {/* 5. Deal of the Day Section */}
      <DealBanner {...dealData} />
      {/* 6. New Arrivals Section */}
      <ProductGrid 
        products={newArrivals}
        title="New Arrivals"
        viewAllLink="/store/products"
        productLinkPrefix="/store/product"
      />
      {/* 7. Quick Links / CTA Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'Best Sellers', color: 'from-yellow-400 to-orange-500' },
          { icon: Gift, label: 'Gift Ideas', color: 'from-pink-400 to-rose-500' },
          { icon: Gem, label: 'Premium Collection', color: 'from-purple-400 to-indigo-500' },
          { icon: TrendingUp, label: 'Trending Now', color: 'from-blue-400 to-cyan-500' },
        ].map((item, index) => (
          <Link
            key={index}
            to="/store/products"
            className={`bg-gradient-to-r ${item.color} p-4 rounded-xl text-white text-center hover:shadow-lg transition-all hover:scale-105`}
          >
            <item.icon className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};
export default StoreHome;
