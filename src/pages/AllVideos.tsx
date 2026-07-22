import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Play, Loader2, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

interface Product {
  id: number;
  name: string;
  description?: string;
  basePrice?: string;
  videoLength?: number;
  videoUrl?: string;
  views?: number;
  status: string;
  createdAt: string;
  images?: { url: string; position: number }[];
}

const AllVideos: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/products`);
        if (response.data.success) {
          setProducts(response.data.data);
        } else {
          setError('Failed to fetch products');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'published') return 'bg-green-100 text-green-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  const getThumbnail = (product: Product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0].url;
    }
    return `https://placehold.co/200x200/e2e8f0/64748b?text=${encodeURIComponent(product.name[0])}`;
  };

  const closeModal = () => setSelectedVideoUrl(null);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">All AI Videos</h1>
        <Link to="/create-product" className="btn-primary flex items-center gap-2">
          Create New
        </Link>
      </div>

      <div className="card-glass overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Product</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Video</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Duration</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Views</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No videos found. Create your first AI video!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getThumbnail(product)}
                        className="w-10 h-10 rounded-lg object-cover"
                        alt={product.name}
                      />
                      <span className="font-medium text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedVideoUrl(product.videoUrl || null)}
                      disabled={!product.videoUrl}
                      className={`p-2 rounded-lg transition-colors ${
                        product.videoUrl
                          ? 'hover:bg-gray-200 text-slate-600 cursor-pointer'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title={product.videoUrl ? 'Play video' : 'No video available'}
                    >
                      <Play size={16} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {product.videoLength ? `${product.videoLength}s` : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(product.status)}`}>
                      {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {product.views?.toLocaleString() ?? 0}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {formatDate(product.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-200 rounded-lg text-slate-600">
                        <Play size={16} />
                      </button>
                      <button className="p-2 hover:bg-gray-200 rounded-lg text-slate-600">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Video Player Modal */}
      {selectedVideoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 text-gray-600 z-10"
            >
              <X size={20} />
            </button>
            <video
              controls
              autoPlay
              className="w-full h-auto max-h-[80vh] object-contain"
              src={selectedVideoUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllVideos;
