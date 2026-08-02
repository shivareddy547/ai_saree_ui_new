import React from 'react';
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
  Award
} from 'lucide-react';

const StoreHome: React.FC = () => {
  const featuredProducts = [
    { id: 1, name: 'Designer Silk Saree', price: 2499, originalPrice: 3499, rating: 4.8, reviews: 120, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 2, name: 'Banarasi Silk Saree', price: 3599, originalPrice: 4599, rating: 4.9, reviews: 85, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 3, name: 'Cotton Saree', price: 999, originalPrice: 1499, rating: 4.6, reviews: 200, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 4, name: 'Party Wear Saree', price: 1899, originalPrice: 2599, rating: 4.7, reviews: 150, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
  ];

  const categories = [
    { name: 'Silk Sarees', icon: '👗', count: 45, color: 'from-purple-500 to-pink-500' },
    { name: 'Cotton Sarees', icon: '👘', count: 32, color: 'from-blue-500 to-cyan-500' },
    { name: 'Designer Sarees', icon: '✨', count: 28, color: 'from-amber-500 to-orange-500' },
    { name: 'Party Wear', icon: '💃', count: 19, color: 'from-rose-500 to-red-500' },
    { name: 'Daily Wear', icon: '🛍️', count: 56, color: 'from-emerald-500 to-teal-500' },
    { name: 'Wedding Collection', icon: '💒', count: 23, color: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-8 md:p-12 text-white">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span className="text-sm font-medium text-yellow-300">New Collection</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Summer Collection
            <br />
            <span className="text-yellow-300">2026</span>
          </h1>
          <p className="text-purple-100 mb-6 text-lg">
            Explore our exclusive saree collection with up to 50% off
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/store/products"
              className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg"
            >
              Shop Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/store/products"
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors border border-white/30"
            >
              View Collections
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-yellow-300/20 rounded-full blur-2xl"></div>
        <div className="absolute right-10 bottom-10 w-20 h-20 bg-pink-400/30 rounded-full blur-xl"></div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹999' },
          { icon: Shield, label: 'Secure Payment', desc: '100% secure transactions' },
          { icon: Clock, label: 'Easy Returns', desc: '30-day return policy' },
          { icon: Award, label: 'Quality Assured', desc: 'Premium quality products' },
        ].map((feature, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 text-center hover:shadow-md transition-shadow">
            <feature.icon className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 text-sm">{feature.label}</h3>
            <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
          <Link to="/store/products" className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to="/store/products"
              className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100 text-center hover:shadow-md transition-all group hover:-translate-y-1"
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
              <p className="text-xs text-gray-500">{category.count} items</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
          <Link to="/store/products" className="text-purple-600 text-sm font-medium flex items-center gap-1 hover:text-purple-700 transition-colors">
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/store/product/${product.id}`}
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
                {product.originalPrice && (
                  <span className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                    {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
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
          ))}
        </div>
      </div>

      {/* Deal of the Day */}
      <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-pink-50 rounded-2xl p-6 md:p-8 border border-yellow-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🔥</div>
            <div>
              <span className="inline-block bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                Deal of the Day
              </span>
              <h3 className="text-xl font-bold text-gray-900">Premium Silk Saree Collection</h3>
              <p className="text-gray-600 text-sm mt-1">Limited time offer - 50% off on select items</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-2xl font-bold text-purple-600">₹1,249</span>
                <span className="text-sm text-gray-400 line-through">₹2,499</span>
              </div>
            </div>
          </div>
          <Link
            to="/store/product/1"
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all whitespace-nowrap"
          >
            Grab Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StoreHome;
