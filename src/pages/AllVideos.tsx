import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Eye, Calendar, PlusCircle, Loader2, X, ExternalLink, Trash2 } from 'lucide-react';
import axios from 'axios';
const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";
// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
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
  cloudinaryVideoPublicId?: string | null;
  isActive?: boolean;
}
const AllVideos: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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
  // Helper function to get Cloudinary video URL
  const getCloudinaryVideoUrl = (publicId: string | null | undefined): string | null => {
    if (!publicId) return null;
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    return `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`;
  };
  // Get the best available video URL for a product
  const getVideoUrl = (video: Video): string | null => {
    // First priority: Cloudinary public ID
    if (video.cloudinaryVideoPublicId) {
      const cloudinaryUrl = getCloudinaryVideoUrl(video.cloudinaryVideoPublicId);
      if (cloudinaryUrl) return cloudinaryUrl;
    }
    // Second priority: videoUrl if it's an HTTP URL (not blob)
    if (video.videoUrl && video.videoUrl.startsWith('http')) {
      return video.videoUrl;
    }
    // Third priority: videoKitUrl if it's an HTTP URL
    if (video.videoKitUrl && video.videoKitUrl.startsWith('http')) {
      return video.videoKitUrl;
    }
    return null;
  };
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
  const handlePreview = (video: Video) => {
    setVideoLoadError(false);
    setSelectedVideo(video);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
    setVideoLoadError(false);
  };
  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };
  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };
  const confirmDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteConfirmId(null);
    try {
      const response = await apiClient.delete(`/products/${id}`);
      if (response.data.success) {
        // Soft delete succeeded – remove from local list
        setVideos((prev) => prev.filter((v) => v.id !== id));
      } else {
        setError(response.data.error || 'Failed to delete product');
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('sessionId');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || err.message || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
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
          {videos.map((video) => {
            const hasVideo = getVideoUrl(video) !== null;
            const isDeleting = deletingId === video.id;
            return (
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
                  {video.cloudinaryVideoPublicId && (
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-blue-500/80 text-white backdrop-blur-md">
                        Cloudinary
                      </span>
                    </div>
                  )}
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
                      onClick={() => handlePreview(video)}
                      disabled={!hasVideo}
                      className={`flex-1 text-center text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        hasVideo
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleDeleteClick(video.id)}
                      disabled={isDeleting}
                      className="flex items-center justify-center text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      title="Delete product"
                    >
                      {isDeleting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {/* Delete confirmation overlay */}
                {deleteConfirmId === video.id && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 rounded-2xl">
                    <p className="text-sm font-medium text-slate-800 text-center mb-1">
                      Delete this product?
                    </p>
                    <p className="text-xs text-gray-500 text-center mb-4">
                      This is a soft delete. The product will be hidden but can be restored later if needed.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelDelete}
                        className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirmDelete(video.id)}
                        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Video Preview Modal */}
      {isModalOpen && selectedVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-lg font-semibold text-slate-800 truncate">
                  {selectedVideo.name}
                </h3>
                {selectedVideo.cloudinaryVideoPublicId && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex-shrink-0">
                    Cloudinary
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            {/* Video Player */}
            <div className="p-4 bg-black">
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                {videoLoadError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                    <div className="bg-yellow-500/20 rounded-full p-4 mb-4">
                      <ExternalLink size={32} className="text-yellow-400" />
                    </div>
                    <p className="text-sm text-yellow-400 mb-2">Unable to load video</p>
                    <p className="text-xs text-gray-400 mb-4">
                      {selectedVideo.cloudinaryVideoPublicId 
                        ? `Public ID: ${selectedVideo.cloudinaryVideoPublicId}`
                        : 'Video URL may be invalid'}
                    </p>
                    <div className="flex gap-3">
                      {getVideoUrl(selectedVideo) && (
                        <a
                          href={getVideoUrl(selectedVideo)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <ExternalLink size={16} />
                          Open in Browser
                        </a>
                      )}
                      <button
                        onClick={() => setVideoLoadError(false)}
                        className="text-sm bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    key={getVideoUrl(selectedVideo) || selectedVideo.id}
                    src={getVideoUrl(selectedVideo) || undefined}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    controlsList="nodownload"
                    onError={() => {
                      console.error('Video failed to load in modal');
                      setVideoLoadError(true);
                    }}
                    onLoadedData={() => {
                      setVideoLoadError(false);
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            </div>
            {/* Modal Footer - Video Info */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Price</span>
                  <span className="ml-2 font-semibold text-purple-700">₹{selectedVideo.basePrice || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">SKU</span>
                  <span className="ml-2 font-medium">{selectedVideo.defaultSku || 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Status</span>
                  <span className={`ml-2 font-medium ${
                    selectedVideo.status === 'published' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {selectedVideo.status || 'draft'}
                  </span>
                </div>
                {selectedVideo.cloudinaryVideoPublicId && (
                  <div className="col-span-2">
                    <span className="text-gray-500 text-xs">Cloudinary Public ID</span>
                    <span className="ml-2 text-xs text-gray-600 font-mono break-all">
                      {selectedVideo.cloudinaryVideoPublicId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AllVideos;
