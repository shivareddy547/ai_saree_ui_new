import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Eye, Calendar, PlusCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";
// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: API_BASE,
});
// Add token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
interface Video {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  defaultSku: string;
  videoUrl: string;
  videoKitUrl: string;
  views: number;
  status: string;
  createdAt: string;
  images: { url: string }[];
  variants: any[];
}
const AllVideos: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Authentication check - same as Dashboard
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const sessionExpiry = localStorage.getItem('sessionExpiry');
    if (!token || !sessionExpiry) {
      navigate('/login');
      return;
    }
    const expiryTime = parseInt(sessionExpiry, 10);
    if (Date.now() >= expiryTime) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionExpiry');
      localStorage.removeItem('sessionId');
      navigate('/login');
      return;
    }
  }, [navigate]);
  useEffect(() => {
    fetchVideos();
  }, []);
  const fetchVideos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/products');
      if (response.data.success) {
        setVideos(response.data.data || []);
      } else {
        setError('Failed to load videos');
      }
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      if (err.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('sessionId');
        navigate('/login');
        return;
      }
      setError(err.message || 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">My Videos</h1>
        <Link to="/create-product" className="btn-primary flex items-center gap-2">
          <PlusCircle size={20} /> Create New Video
        </Link>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {videos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play size={32} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Videos Yet</h3>
          <p className="text-gray-500 mb-6">Create your first product video to get started</p>
          <Link to="/create-product" className="btn-primary inline-flex items-center gap-2">
            <PlusCircle size={20} /> Create Video
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all bg-white"
            >
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {video.images && video.images.length > 0 ? (
                  <img
                    src={video.images[0].url}
                    alt={video.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                    <Play size={48} className="text-purple-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="font-bold text-sm truncate">{video.name}</h4>
                  <div className="flex items-center justify-between text-xs opacity-90">
                    <span className="flex items-center gap-1">
                      <Eye size={12} />
                      {video.views || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(video.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-md ${
                    video.status === 'published'
                      ? 'bg-green-500/80 text-white'
                      : 'bg-yellow-500/80 text-white'
                  }`}>
                    {video.status || 'draft'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Price</span>
                  <span className="font-semibold text-purple-700">₹{video.basePrice || 0}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-500">SKU</span>
                  <span className="text-sm text-gray-700">{video.defaultSku || 'N/A'}</span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Link
                    to={`/create-product?edit=${video.id}`}
                    className="flex-1 text-center text-sm bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      // Handle video preview
                      if (video.videoUrl) {
                        window.open(video.videoUrl, '_blank');
                      }
                    }}
                    className="flex-1 text-center text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default AllVideos;
