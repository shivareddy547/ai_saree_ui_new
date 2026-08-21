import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Star,
  Heart,
  Share2,
  ShoppingBag,
  Truck,
  Shield,
  Clock,
  Minus,
  Plus,
  ThumbsUp,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'lovecart';
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
interface ProductVariant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  price: number;
  costPrice?: number;
  stockQuantity: number;
}
interface ProductImage {
  id: string;
  url: string;
  position: number;
  variantId?: string | null;
}
interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  costPrice?: number;
  stockQuantity?: number;
  defaultSku: string;
  videoUrl?: string;
  cloudinaryVideoPublicId?: string;
  variants: ProductVariant[];
  images: ProductImage[];
  category?: any;
  subcategory?: any;
  showInFeaturedProducts: boolean;
  showInNewArrivals: boolean;
  showInBestSellers: boolean;
  showInPremiumProducts: boolean;
  createdAt: string;
  updatedAt: string;
}
interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}
const getVideoUrlFromCloudinary = (publicId?: string): string | undefined => {
  if (!publicId) return undefined;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${publicId}`;
};
const toPositivePrice = (...candidates: Array<number | string | null | undefined>): number => {
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = typeof c === 'number' ? c : parseFloat(String(c));
    if (!isNaN(n) && n > 0) return n;
  }
  return 0;
};
const StoreProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted: checkWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);
  const trackedRef = useRef<string | null>(null);
  const pauseAllVideos = useCallback(() => {
    if (videoRef.current) videoRef.current.pause();
    if (lightboxVideoRef.current) lightboxVideoRef.current.pause();
  }, []);
  // Track page view once per product id (supports provider query param)
  useEffect(() => {
    if (!id) return;
    const trackKey = id + '|' + (searchParams.get('provider') || '');
    if (trackedRef.current === trackKey) return;
    trackedRef.current = trackKey;
    const path = `/store/product/${id}`;
    const provider = searchParams.get('provider') || undefined;
    apiClient
      .post('/store/track-page-view', { path, provider })
      .catch((err) => {
        // Silent fail – tracking must never break the product page
        console.error('Page view tracking failed:', err);
      });
  }, [id, searchParams]);
  useEffect(() => {
    if (id) fetchProduct(id);
  }, [id]);
  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      setVideoError(false);
      const response = await apiClient.get(`/store/products/${productId}`);
      const data = response.data.data;
      let videoUrl = data.videoUrl;
      if (data.cloudinaryVideoPublicId) {
        const cloudinaryUrl = getVideoUrlFromCloudinary(data.cloudinaryVideoPublicId);
        if (cloudinaryUrl) videoUrl = cloudinaryUrl;
      }
      data.videoUrl = videoUrl;
      setProduct(data);
      const allVariants: ProductVariant[] = data.variants || [];
      const meaningfulVariants = allVariants.filter(
        (v: ProductVariant) => v.sku && v.sku.trim() !== '' && (v.size || v.color)
      );
      const variantsForSelection =
        meaningfulVariants.length > 0 ? meaningfulVariants : allVariants;
      const firstAvailable =
        variantsForSelection.find((v) => v.stockQuantity > 0) ||
        variantsForSelection[0] ||
        null;
      setSelectedVariant(firstAvailable);
      const colorSet = new Set<string>();
      const sizeSet = new Set<string>();
      meaningfulVariants.forEach((v: ProductVariant) => {
        if (v.color) colorSet.add(v.color);
        if (v.size) sizeSet.add(v.size);
      });
      setColors(Array.from(colorSet));
      setSizes(Array.from(sizeSet));
      if (firstAvailable?.color) setSelectedColor(firstAvailable.color);
      if (firstAvailable?.size) setSelectedSize(firstAvailable.size);
      try {
        const wished = await checkWishlist(data.id);
        setIsWishlisted(wished);
      } catch (err) {
        console.error('Failed to check wishlist:', err);
      }
    } catch (err: any) {
      console.error('Failed to fetch product:', err);
      setError(err.response?.data?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!product) return;
    const allVariants = product.variants || [];
    const meaningfulVariants = allVariants.filter(
      (v: ProductVariant) => v.sku && v.sku.trim() !== '' && (v.size || v.color)
    );
    const pool = meaningfulVariants.length > 0 ? meaningfulVariants : allVariants;
    if (pool.length === 0) {
      setSelectedVariant(null);
      return;
    }
    let matched = pool.find(
      (v: ProductVariant) =>
        (selectedColor ? v.color === selectedColor : true) &&
        (selectedSize ? v.size === selectedSize : true)
    );
    if (!matched) matched = pool[0];
    setSelectedVariant(matched || null);
  }, [selectedColor, selectedSize, product]);
  // Compute display images based on selected variant
  const displayImages = useMemo(() => {
    if (!product) return [];
    const allImages = product.images || [];
    if (!selectedVariant) {
      // No variant selected: show product-level images (variantId null)
      const productImages = allImages.filter(img => img.variantId === null || img.variantId === undefined);
      // Sort by position
      productImages.sort((a, b) => (a.position || 0) - (b.position || 0));
      return productImages.map(img => img.url);
    }
    // Variant selected: find images for this variant
    const variantImages = allImages.filter(img => img.variantId === selectedVariant.id);
    if (variantImages.length > 0) {
      variantImages.sort((a, b) => (a.position || 0) - (b.position || 0));
      return variantImages.map(img => img.url);
    }
    // Fallback to product-level images
    const productImages = allImages.filter(img => img.variantId === null || img.variantId === undefined);
    productImages.sort((a, b) => (a.position || 0) - (b.position || 0));
    return productImages.map(img => img.url);
  }, [product, selectedVariant]);
  // Build media items (images + video) from displayImages and video
  const mediaItems = useMemo(() => {
    const items: MediaItem[] = [];
    displayImages.forEach(url => {
      items.push({ type: 'image', url });
    });
    if (product?.videoUrl) {
      items.push({
        type: 'video',
        url: product.videoUrl,
        thumbnail: displayImages.length > 0 ? displayImages[0] : undefined,
      });
    }
    return items;
  }, [displayImages, product?.videoUrl]);
  // Reset active image when displayImages change
  useEffect(() => {
    setActiveImage(0);
  }, [displayImages]);
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };
  const handleAddToCart = async () => {
    if (!product || isAdding) return;
    const allVariants = product.variants || [];
    const meaningfulVariants = allVariants.filter(
      (v: ProductVariant) => v.sku && v.sku.trim() !== '' && (v.size || v.color)
    );
    const hasConfiguredVariants = meaningfulVariants.length > 0;
    let variant: ProductVariant | null = selectedVariant;
    if (!variant && allVariants.length > 0) {
      variant = hasConfiguredVariants ? meaningfulVariants[0] : allVariants[0];
    }
    let price = 0;
    if (hasConfiguredVariants) {
      price = toPositivePrice(variant?.price, product.basePrice);
    } else {
      price = toPositivePrice(product.basePrice, variant?.price);
    }
    if (price <= 0) {
      alert('This product has an invalid price.');
      return;
    }
    setIsAdding(true);
    try {
      await addToCart(
        {
          id: product.id,
          name: product.name,
          price,
          image: displayImages.length > 0 ? displayImages[0] : '',
          variantId: variant?.id || '',
        },
        quantity
      );
    } catch (err) {
      console.error('Add to cart failed:', err);
      alert('Failed to add product to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };
  const handleWishlistToggle = async () => {
    if (!product || wishlistLoading) return;
    setWishlistLoading(true);
    try {
      const result = await toggleWishlist(product.id);
      setIsWishlisted(result.isWishlisted);
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      alert('Failed to update wishlist. Please try again.');
    } finally {
      setWishlistLoading(false);
    }
  };
  const toggleVideo = () => {
    if (showVideo) pauseAllVideos();
    setShowVideo(!showVideo);
    setVideoError(false);
  };
  const openLightbox = (index: number) => {
    if (mediaItems.length === 0) return;
    pauseAllVideos();
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };
  const closeLightbox = () => {
    pauseAllVideos();
    setLightboxOpen(false);
    document.body.style.overflow = 'unset';
  };
  const goToPrev = () => {
    const newIndex = lightboxIndex === 0 ? mediaItems.length - 1 : lightboxIndex - 1;
    if (mediaItems[newIndex]?.type === 'image') pauseAllVideos();
    setLightboxIndex(newIndex);
  };
  const goToNext = () => {
    const newIndex = lightboxIndex === mediaItems.length - 1 ? 0 : lightboxIndex + 1;
    if (mediaItems[newIndex]?.type === 'image') pauseAllVideos();
    setLightboxIndex(newIndex);
  };
  useEffect(() => {
    if (!lightboxOpen) return;
    const currentItem = mediaItems[lightboxIndex];
    if (currentItem?.type === 'image') pauseAllVideos();
  }, [lightboxIndex, lightboxOpen, mediaItems, pauseAllVideos]);
  const handleVideoError = () => {
    setVideoError(true);
    console.error('Video failed to load:', product?.videoUrl);
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[4/5] bg-gray-200 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-1/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-12 w-1/2 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error || 'Product not found'}</p>
        <Link to="/store/products" className="text-purple-600 hover:underline mt-2 inline-block">
          Back to Products
        </Link>
      </div>
    );
  }
  const allVariants = product.variants || [];
  const meaningfulVariants = allVariants.filter(
    (v: ProductVariant) => v.sku && v.sku.trim() !== '' && (v.size || v.color)
  );
  const hasVariants = meaningfulVariants.length > 0;
  const variantPrice = hasVariants
    ? toPositivePrice(selectedVariant?.price, product.basePrice)
    : toPositivePrice(product.basePrice, selectedVariant?.price);
  const costPrice = hasVariants ? selectedVariant?.costPrice : product.costPrice;
  const originalPrice =
    costPrice && Number(costPrice) > variantPrice ? Number(costPrice) : undefined;
  const discount = originalPrice
    ? Math.round(((originalPrice - variantPrice) / originalPrice) * 100)
    : 0;
  // Use displayImages for the main gallery
  const images = displayImages.length > 0 ? displayImages : ['https://via.placeholder.com/600x800?text=No+Image'];
  let stockQuantity = 0;
  let isInStock = false;
  if (hasVariants) {
    stockQuantity = selectedVariant ? selectedVariant.stockQuantity : 0;
    isInStock = stockQuantity > 0;
  } else {
    stockQuantity =
      product.stockQuantity !== undefined && product.stockQuantity !== null
        ? product.stockQuantity
        : allVariants[0]?.stockQuantity ?? 999;
    isInStock = stockQuantity > 0;
  }
  const canAddToCart = variantPrice > 0 && isInStock && !isAdding;
  const displaySku = hasVariants
    ? selectedVariant
      ? selectedVariant.sku
      : product.defaultSku || 'N/A'
    : product.defaultSku || allVariants[0]?.sku || 'N/A';
  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">
          Store
        </Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/products" className="text-gray-500 hover:text-purple-600">
          Products
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div
            className="aspect-[4/5] bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl overflow-hidden mb-4 border border-purple-100 relative cursor-pointer group"
            onClick={() => {
              if (showVideo && product.videoUrl) {
                const videoIndex = mediaItems.findIndex((item) => item.type === 'video');
                if (videoIndex !== -1) openLightbox(videoIndex);
              } else {
                openLightbox(activeImage);
              }
            }}
          >
            {!showVideo && product.videoUrl && !videoError && (
              <div
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVideo();
                }}
              >
                <Play className="w-16 h-16 text-white drop-shadow-lg" />
              </div>
            )}
            {showVideo && product.videoUrl ? (
              <div className="relative w-full h-full bg-black">
                {videoError ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white p-4">
                      <p className="text-lg font-semibold">Video unavailable</p>
                      <p className="text-sm text-gray-400 mt-2">The video failed to load</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoError(false);
                          toggleVideo();
                        }}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={product.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                    poster={images[0]}
                    onError={handleVideoError}
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideo();
                  }}
                  className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full z-20 hover:bg-black/80"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <img
                src={images[activeImage] || images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => {
                  if (showVideo) {
                    pauseAllVideos();
                    setShowVideo(false);
                  }
                  setActiveImage(index);
                  openLightbox(index);
                }}
                className={`aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden border-2 ${
                  activeImage === index && !showVideo
                    ? 'border-purple-600 ring-2 ring-purple-200'
                    : 'border-transparent'
                } hover:border-purple-400 transition-all`}
              >
                <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
            {product.videoUrl && (
              <button
                onClick={() => {
                  setShowVideo(true);
                  const videoIndex = mediaItems.findIndex((item) => item.type === 'video');
                  if (videoIndex !== -1) openLightbox(videoIndex);
                }}
                className={`aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden border-2 flex items-center justify-center ${
                  showVideo ? 'border-purple-600 ring-2 ring-purple-200' : 'border-transparent'
                } hover:border-purple-400 transition-all`}
              >
                <Play className="w-6 h-6 text-purple-600" />
                <span className="sr-only">Play video</span>
              </button>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between">
              <div>
                {product.category && (
                  <p className="text-sm text-purple-600 font-medium">{product.category.name}</p>
                )}
                <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
              </div>
              <button
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                className={`p-2 rounded-full transition-colors ${
                  wishlistLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
                }`}
                aria-label="Toggle wishlist"
              >
                <Heart
                  className={`w-6 h-6 ${
                    isWishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-400 hover:text-pink-500'
                  } transition-colors`}
                />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-700">4.5</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">100 reviews</span>
              <span className="text-gray-300">|</span>
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Write a review
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-purple-600">₹{variantPrice}</span>
            {originalPrice && (
              <span className="text-lg text-gray-400 line-through">₹{originalPrice}</span>
            )}
            {discount > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                {discount}% OFF
              </span>
            )}
          </div>
          <p className="text-gray-600 leading-relaxed">
            {product.description || 'No description available.'}
          </p>
          <p className="text-sm text-gray-400">SKU: {displaySku}</p>
          {hasVariants && (
            <>
              {colors.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Color: {selectedColor}</h3>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-full border-2 ${
                          selectedColor === color
                            ? 'border-purple-600 ring-2 ring-purple-200'
                            : 'border-gray-200'
                        } transition-all hover:scale-110`}
                        style={{ backgroundColor: color.toLowerCase() }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
              {sizes.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Size</h3>
                  <div className="flex flex-wrap gap-3">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-12 h-12 rounded-lg border-2 font-medium transition-all ${
                          selectedSize === size
                            ? 'border-purple-600 bg-purple-50 text-purple-600'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Quantity</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-lg bg-white/80 backdrop-blur-sm">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600"
                  disabled={!isInStock || isAdding}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-medium text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600"
                  disabled={!isInStock || isAdding}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className={`text-sm font-medium ${isInStock ? 'text-green-600' : 'text-red-600'}`}>
                {isInStock ? `✓ In Stock (${stockQuantity} available)` : 'Out of Stock'}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                canAddToCart
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              {isAdding ? 'Adding...' : isInStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button className="flex-1 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold border-2 border-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" />
              Buy Now
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-200">
            {[
              { icon: Truck, label: 'Free Shipping', desc: 'On orders above ₹999' },
              { icon: Shield, label: 'Secure Payment', desc: '100% secure' },
              { icon: Clock, label: 'Easy Returns', desc: '30-day policy' },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <feature.icon className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">{feature.label}</p>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {lightboxOpen && mediaItems.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          ref={lightboxRef}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
          >
            <X className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-4 text-white hover:text-gray-300 z-10 p-2"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 text-white hover:text-gray-300 z-10 p-2"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {mediaItems[lightboxIndex].type === 'image' ? (
              <img
                src={mediaItems[lightboxIndex].url}
                alt={`Product ${lightboxIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="relative w-full max-h-[80vh] aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={lightboxVideoRef}
                  src={mediaItems[lightboxIndex].url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  poster={mediaItems[lightboxIndex].thumbnail}
                  onError={(e) => {
                    console.error('Lightbox video failed to load:', mediaItems[lightboxIndex].url);
                    e.currentTarget.controls = false;
                  }}
                />
              </div>
            )}
          </div>
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
            {mediaItems.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (mediaItems[idx].type === 'image') pauseAllVideos();
                  setLightboxIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === lightboxIndex ? 'bg-white w-4' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((review) => (
            <div
              key={review}
              className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                      JD
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">John Doe</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Amazing product! The quality is outstanding and the design is beautiful.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Verified Purchase • 2 days ago</p>
                </div>
                <button className="text-gray-400 hover:text-purple-600">
                  <ThumbsUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default StoreProductDetail;
