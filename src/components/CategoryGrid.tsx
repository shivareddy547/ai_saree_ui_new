import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import axios from 'axios';
// ===== INTERFACES =====
export interface CategoryGridItem {
  id: string | number;
  title: string;
  subtitle?: string;
  highlightText?: string;
  description?: string;
  image?: string;
  bgGradient: string;
  badgeText?: string;
  badgeIcon?: string;
  order: number;
  isActive: boolean;
  showInHero: boolean;
  showInCategoryGrid: boolean;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  permalink?: string;
  createdAt?: string;
  updatedAt?: string;
}
// Shape returned by GET /api/categories
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
  createdAt?: string;
  updatedAt?: string;
}
interface CategoryGridProps {
  categories?: CategoryGridItem[];
  apiEndpoint?: string;
  fetchOnMount?: boolean;
  title?: string;
  subtitle?: string;
}
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
// Auth-aware axios instance (same pattern as HeroBanner)
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
// Map a Category API item into the CategoryGridItem shape
const mapCategoryToGridItem = (category: CategoryApiItem): CategoryGridItem => ({
  id: category.id,
  title: category.name,
  subtitle: category.subtitle,
  highlightText: category.highlightText,
  description: category.description || '',
  image: category.imageUrl,
  bgGradient:
    category.bgGradient ||
    'bg-gradient-to-br from-purple-600 via-pink-500 to-rose-500',
  badgeText: category.badgeText,
  badgeIcon: category.badgeIcon,
  order: category.order,
  isActive: category.isActive,
  showInHero: category.showInHero,
  showInCategoryGrid: category.showInCategoryGrid,
  primaryButtonText: category.primaryButtonText || 'Shop Now',
  primaryButtonLink:
    category.primaryButtonLink ||
    (category.permalink
      ? `/store/products?category=${category.permalink}`
      : '/store/products'),
  secondaryButtonText: category.secondaryButtonText,
  secondaryButtonLink: category.secondaryButtonLink,
  permalink: category.permalink,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});
// ===== COMPONENT: CategoryGrid =====
const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories: propCategories,
  apiEndpoint = '/categories',
  fetchOnMount = true,
  title = 'Shop by Category',
  subtitle = 'Discover our curated collections',
}) => {
  const [categories, setCategories] = useState<CategoryGridItem[]>(
    propCategories || []
  );
  const [loading, setLoading] = useState(fetchOnMount && !propCategories);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (fetchOnMount && !propCategories) {
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnMount, propCategories]);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<CategoryApiItem[]>(apiEndpoint);
      const activeCategories = (response.data || [])
        .filter(
          (category) =>
            category.isActive !== false && category.showInCategoryGrid === true
        )
        .sort((a, b) => a.order - b.order)
        .map(mapCategoryToGridItem);
      setCategories(activeCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  // Loading state
  if (loading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="h-8 w-64 bg-gray-200 rounded-lg mx-auto animate-pulse mb-3" />
            <div className="h-4 w-48 bg-gray-200 rounded mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 h-64 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }
  // Error state
  if (error) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-r from-red-50 to-red-100 p-8 border border-red-200 text-center">
            <p className="font-semibold text-red-600">Unable to load categories</p>
            <p className="text-sm mt-2 text-red-500">{error}</p>
            <button
              onClick={fetchCategories}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }
  // No categories available
  if (categories.length === 0) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 p-8 text-center">
            <p className="text-gray-500">No categories available</p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">{subtitle}</p>
          )}
        </div>
        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={
                category.primaryButtonLink ||
                (category.permalink
                  ? `/store/products?category=${category.permalink}`
                  : '/store/products')
              }
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Background / Gradient */}
              <div
                className={`relative ${category.bgGradient} p-6 md:p-8 text-white min-h-[260px] flex flex-col justify-between`}
              >
                {/* Image overlay if available */}
                {category.image && (
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                    <img
                      src={
                        category.image.startsWith('http')
                          ? category.image
                          : `${API_BASE_URL.replace('/api', '')}${category.image}`
                      }
                      alt={category.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="relative z-10">
                  {/* Badge */}
                  {(category.badgeText || category.subtitle) && (
                    <div className="flex items-center gap-2 mb-3">
                      {category.badgeIcon && (
                        <span className="text-xl">{category.badgeIcon}</span>
                      )}
                      {!category.badgeIcon && (
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                      )}
                      <span className="text-xs font-medium text-yellow-200 uppercase tracking-wider">
                        {category.badgeText || category.subtitle}
                      </span>
                    </div>
                  )}
                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-bold mb-2 leading-tight">
                    {category.title}
                    {category.highlightText && (
                      <span className="block text-yellow-200 text-lg font-semibold mt-1">
                        {category.highlightText}
                      </span>
                    )}
                  </h3>
                  {/* Description */}
                  {category.description && (
                    <p className="text-white/80 text-sm line-clamp-2 mb-4">
                      {category.description}
                    </p>
                  )}
                </div>
                {/* CTA */}
                <div className="relative z-10 mt-auto">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full group-hover:bg-white/30 transition-colors border border-white/30">
                    {category.primaryButtonText || 'Shop Now'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
                {/* Decorative blobs */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
export default CategoryGrid;
