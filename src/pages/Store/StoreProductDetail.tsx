import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  Share2, 
  ShoppingBag,
  ChevronLeft,
  Truck,
  Shield,
  Clock,
  Minus,
  Plus,
  Check,
  ThumbsUp,
  Store
} from 'lucide-react';

const StoreProductDetail: React.FC = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('Red');
  const [selectedSize, setSelectedSize] = useState('M');
  const [activeImage, setActiveImage] = useState(0);

  const product = {
    id: 1,
    name: 'Designer Silk Saree',
    price: 2499,
    originalPrice: 3499,
    rating: 4.8,
    reviews: 120,
    description: 'This exquisite designer silk saree features intricate handwoven patterns and a luxurious feel. Perfect for weddings and special occasions. Made from premium quality silk with traditional motifs.',
    image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=600&h=800&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=200&h=250&fit=crop',
      'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=200&h=250&fit=crop',
      'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=200&h=250&fit=crop',
      'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=200&h=250&fit=crop',
    ],
    colors: ['Red', 'Blue', 'Green', 'Gold', 'Purple'],
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
    brand: 'SareeStore Collection',
    sku: 'SS-2026-001',
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/products" className="text-gray-500 hover:text-purple-600">Products</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div>
          <div className="aspect-[4/5] bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl overflow-hidden mb-4 border border-purple-100">
            <img
              src={product.images[activeImage] || product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {product.images.map((img, index) => (
              <button
                key={index}
                onClick={() => setActiveImage(index)}
                className={`aspect-square bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg overflow-hidden border-2 ${
                  activeImage === index ? 'border-purple-600 ring-2 ring-purple-200' : 'border-transparent'
                } hover:border-purple-400 transition-all`}
              >
                <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">{product.brand}</p>
                <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Heart className="w-5 h-5 text-gray-400 hover:text-red-500" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-gray-700">{product.rating}</span>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">{product.reviews} reviews</span>
              <span className="text-gray-300">|</span>
              <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">Write a review</button>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-purple-600">₹{product.price}</span>
            {product.originalPrice && (
              <span className="text-lg text-gray-400 line-through">₹{product.originalPrice}</span>
            )}
            {product.originalPrice && (
              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {/* SKU */}
          <p className="text-sm text-gray-400">SKU: {product.sku}</p>

          {/* Color Selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Color: {selectedColor}</h3>
            <div className="flex gap-3">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    selectedColor === color ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200'
                  } transition-all hover:scale-110`}
                  style={{ backgroundColor: color.toLowerCase() }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Size</h3>
            <div className="flex gap-3">
              {product.sizes.map((size) => (
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

          {/* Quantity */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Quantity</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-lg bg-white/80 backdrop-blur-sm">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-medium text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors text-gray-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm font-medium text-green-600">{product.inStock ? '✓ In Stock' : 'Out of Stock'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Add to Cart
            </button>
            <button className="flex-1 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold border-2 border-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" />
              Buy Now
            </button>
          </div>

          {/* Features */}
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

      {/* Reviews Section */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((review) => (
            <div key={review} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100">
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
                          <Star key={i} className={`w-3 h-3 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
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
