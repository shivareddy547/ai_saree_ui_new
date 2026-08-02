import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import axios from 'axios';
// ===== INTERFACES =====
export interface Banner {
  id: string | number;
  title: string;
  subtitle?: string;
  highlightText?: string;
  description: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  image?: string;
  bgGradient: string;
  badgeText?: string;
  badgeIcon?: string;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
interface HeroBannerProps {
  banners?: Banner[];
  autoPlayInterval?: number;
  showIndicators?: boolean;
  showArrows?: boolean;
  apiEndpoint?: string;
  fetchOnMount?: boolean;
}
// ===== COMPONENT: HeroBanner =====
const HeroBanner: React.FC<HeroBannerProps> = ({
  banners: propBanners,
  autoPlayInterval = 5000,
  showIndicators = true,
  showArrows = true,
  apiEndpoint = '/api/banners',
  fetchOnMount = true,
}) => {
  const [banners, setBanners] = useState<Banner[]>(propBanners || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(fetchOnMount && !propBanners);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  // Fetch banners from API
  useEffect(() => {
    if (fetchOnMount && !propBanners) {
      fetchBanners();
    }
  }, [fetchOnMount, propBanners]);
  // Set up auto-play
  useEffect(() => {
    if (banners.length > 1 && autoPlayInterval > 0) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [banners.length, autoPlayInterval, currentIndex]);
  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(apiEndpoint);
      // Filter active banners and sort by order
      const activeBanners = response.data
        ?.filter((banner: Banner) => banner.isActive !== false)
        ?.sort((a: Banner, b: Banner) => a.order - b.order) || [];
      setBanners(activeBanners);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError('Failed to load banners');
      // Use fallback banners if API fails
      setBanners(getFallbackBanners());
    } finally {
      setLoading(false);
    }
  };
  const getFallbackBanners = (): Banner[] => {
    return [
      {
        id: 1,
        title: 'Summer Collection',
        subtitle: 'New Collection',
        highlightText: '2026',
        description: 'Explore our exclusive saree collection with up to 50% off',
        primaryButtonText: 'Shop Now',
        primaryButtonLink: '/store/products',
        secondaryButtonText: 'View Collections',
        secondaryButtonLink: '/store/products',
        bgGradient: 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600',
        badgeText: 'New Collection',
        badgeIcon: '✨',
        order: 1,
        isActive: true,
      },
      {
        id: 2,
        title: 'Wedding Special',
        subtitle: 'Bridal Collection',
        highlightText: '2026',
        description: 'Stunning bridal sarees for your special day',
        primaryButtonText: 'Explore Now',
        primaryButtonLink: '/store/products?category=wedding',
        secondaryButtonText: 'View Collection',
        secondaryButtonLink: '/store/products',
        bgGradient: 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600',
        badgeText: 'Wedding Special',
        badgeIcon: '💒',
        order: 2,
        isActive: true,
      },
      {
        id: 3,
        title: 'Festive Collection',
        subtitle: 'Festival Special',
        highlightText: '2026',
        description: 'Celebrate the festivals with our exquisite collection',
        primaryButtonText: 'Shop Now',
        primaryButtonLink: '/store/products',
        secondaryButtonText: 'View Collection',
        secondaryButtonLink: '/store/products',
        bgGradient: 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600',
        badgeText: 'Festival Special',
        badgeIcon: '🎉',
        order: 3,
        isActive: true,
      },
    ];
  };
  const startAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    if (banners.length > 1) {
      autoPlayRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval);
    }
  };
  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };
  const goToNext = () => {
    if (isTransitioning || banners.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };
  const goToPrevious = () => {
    if (isTransitioning || banners.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };
  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex || banners.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };
  const handleMouseEnter = () => {
    stopAutoPlay();
  };
  const handleMouseLeave = () => {
    if (banners.length > 1 && autoPlayInterval > 0) {
      startAutoPlay();
    }
  };
  // Loading state
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 p-8 md:p-12 animate-pulse">
        <div className="h-64 md:h-80 flex items-center justify-center">
          <div className="text-gray-500">Loading banners...</div>
        </div>
      </div>
    );
  }
  // Error state with fallback
  if (error && banners.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 to-red-100 p-8 md:p-12 border border-red-200">
        <div className="text-red-600 text-center">
          <p className="font-semibold">Unable to load banners</p>
          <p className="text-sm mt-2">{error}</p>
          <button 
            onClick={fetchBanners}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  // No banners available
  if (banners.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 p-8 md:p-12">
        <div className="text-gray-500 text-center">
          <p>No banners available</p>
        </div>
      </div>
    );
  }
  const currentBanner = banners[currentIndex];
  return (
    <div 
      className="relative overflow-hidden rounded-2xl group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Banner Content */}
      <div className={`relative ${currentBanner.bgGradient} p-8 md:p-12 text-white min-h-[300px] md:min-h-[350px] transition-all duration-500`}>
        <div className="relative z-10 max-w-2xl">
          {/* Badge */}
          {(currentBanner.badgeText || currentBanner.subtitle) && (
            <div className="flex items-center gap-2 mb-4">
              {currentBanner.badgeIcon && (
                <span className="text-2xl">{currentBanner.badgeIcon}</span>
              )}
              {!currentBanner.badgeIcon && currentBanner.subtitle && (
                <Sparkles className="w-5 h-5 text-yellow-300" />
              )}
              <span className="text-sm font-medium text-yellow-300">
                {currentBanner.badgeText || currentBanner.subtitle}
              </span>
            </div>
          )}
          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            {currentBanner.title}
            {currentBanner.highlightText && (
              <>
                <br />
                <span className="text-yellow-300">{currentBanner.highlightText}</span>
              </>
            )}
          </h1>
          {/* Description */}
          <p className="text-purple-100 mb-6 text-lg">
            {currentBanner.description}
          </p>
          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link
              to={currentBanner.primaryButtonLink}
              className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg"
            >
              {currentBanner.primaryButtonText}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {currentBanner.secondaryButtonText && currentBanner.secondaryButtonLink && (
              <Link
                to={currentBanner.secondaryButtonLink}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors border border-white/30"
              >
                {currentBanner.secondaryButtonText}
              </Link>
            )}
          </div>
        </div>
        {/* Decorative Blobs */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-yellow-300/20 rounded-full blur-2xl"></div>
        <div className="absolute right-10 bottom-10 w-20 h-20 bg-pink-400/30 rounded-full blur-xl"></div>
      </div>
      {/* Navigation Arrows */}
      {showArrows && banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 hover:scale-110 duration-200"
            aria-label="Previous banner"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 hover:scale-110 duration-200"
            aria-label="Next banner"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      {/* Indicators */}
      {showIndicators && banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-white shadow-lg'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
      {/* Slide Counter */}
      {banners.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
          {currentIndex + 1} / {banners.length}
        </div>
      )}
    </div>
  );
};
export default HeroBanner;
