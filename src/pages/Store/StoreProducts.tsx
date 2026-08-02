import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  Filter, 
  ChevronDown,
  Grid,
  List,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';

const StoreProducts: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const products = [
    { id: 1, name: 'Designer Silk Saree', price: 2499, originalPrice: 3499, rating: 4.8, reviews: 120, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 2, name: 'Banarasi Silk Saree', price: 3599, originalPrice: 4599, rating: 4.9, reviews: 85, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 3, name: 'Cotton Saree', price: 999, originalPrice: 1499, rating: 4.6, reviews: 200, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 4, name: 'Party Wear Saree', price: 1899, originalPrice: 2599, rating: 4.7, reviews: 150, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 5, name: 'Wedding Collection Saree', price: 4999, originalPrice: 6999, rating: 4.9, reviews: 95, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
    { id: 6, name: 'Daily Wear Saree', price: 799, originalPrice: 1099, rating: 4.5, reviews: 300, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=300&h=400&fit=crop' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
          <p className="text-sm text-gray-500 mt-1">Showing 1-6 of 45 products</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-48 bg-white/80 backdrop-blur-sm"
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-3">Category</h4>
              <div className="space-y-2">
                {['Silk Sarees', 'Cotton Sarees', 'Designer Sarees', 'Party Wear', 'Daily Wear'].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    {cat}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-3">Price Range</h4>
              <div className="space-y-2">
                {['Under ₹1000', '₹1000 - ₹2000', '₹2000 - ₹3000', 'Above ₹3000'].map((range) => (
                  <label key={range} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    <input type="radio" name="price" className="text-purple-600 focus:ring-purple-500" />
                    {range}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-3">Rating</h4>
              <div className="space-y-2">
                {[5, 4, 3, 2].map((rating) => (
                  <label key={rating} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      <span className="ml-1 text-gray-500">& up</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-3">Sort By</h4>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/80 backdrop-blur-sm">
                <option>Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating: High to Low</option>
                <option>Newest First</option>
              </select>
              <button className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/store/product/${product.id}`}
            className={`group bg-white rounded-xl overflow-hidden shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
              viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
            }`}
          >
            <div className={`relative bg-gradient-to-br from-purple-50 to-pink-50 ${viewMode === 'list' ? 'w-full sm:w-48 h-48 flex-shrink-0' : 'aspect-[3/4]'} overflow-hidden`}>
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
            <div className={`p-4 flex-1 ${viewMode === 'list' ? 'flex flex-col justify-center' : ''}`}>
              <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
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
              {viewMode === 'list' && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  Premium quality saree with intricate designs and comfortable fabric.
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-500">Showing 1-6 of 45 products</p>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50" disabled>
            Previous
          </button>
          <button className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium">1</button>
          <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">2</button>
          <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">3</button>
          <button className="px-3 py-1 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreProducts;
