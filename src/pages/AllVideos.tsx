import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Eye, Calendar, PlusCircle, Loader2, X, ExternalLink, Trash2, Search, Filter, Download, CheckCircle } from 'lucide-react';
import axios from 'axios';
const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:3000/api";
const apiClient = axios.create({
  baseURL: API_BASE,
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
interface Category {
  id: string;
  name: string;
}
const AllVideos: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const successTimer = useRef<NodeJS.Timeout | null>(null);
  // Authentication check
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
  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      if (successTimer.current) {
        clearTimeout(successTimer.current);
      }
      successTimer.current = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => {
        if (successTimer.current) {
          clearTimeout(successTimer.current);
        }
      };
    }
  }, [successMessage]);
  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);
  // Fetch categories
  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await apiClient.get('/categories');
      const cats = response.data.map((cat: any) => ({
        id: String(cat.id),
        name: cat.name,
      }));
      setCategories(cats);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  // Fetch videos with filters
  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (statusFilter === 'active' || statusFilter === 'deleted') {
        params.append('status', statusFilter);
      }
      if (categoryFilter) {
        params.append('categoryId', categoryFilter);
      }
      const url = `/products${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
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
      setIsFiltering(false);
    }
  }, [debouncedSearch, statusFilter, categoryFilter, navigate]);
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);
  // Helper functions
  const getCloudinaryVideoUrl = (publicId: string | null | undefined): string | null => {
    if (!publicId) return null;
    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
    return `https://res.cloudinary.com/${cloudName}/video/upload/${publicId}`;
  };
  const getVideoUrl = (video: Video): string | null => {
    if (video.cloudinaryVideoPublicId) {
      const cloudinaryUrl = getCloudinaryVideoUrl(video.cloudinaryVideoPublicId);
      if (cloudinaryUrl) return cloudinaryUrl;
    }
    if (video.videoUrl && video.videoUrl.startsWith('http')) {
      return video.videoUrl;
    }
    if (video.videoKitUrl && video.videoKitUrl.startsWith('http')) {
      return video.videoKitUrl;
    }
    return null;
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
  const parseBlobError = async (err: any): Promise<string> => {
    try {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          return errorData.message || errorData.error || 'Failed to export products to Excel';
        } catch {
          return 'Failed to export products to Excel';
        }
      }
      return err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to export products to Excel';
    } catch {
      return 'Failed to export products to Excel';
    }
  };
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      if (statusFilter === 'active' || statusFilter === 'deleted') {
        params.append('status', statusFilter);
      }
      if (categoryFilter) {
        params.append('categoryId', categoryFilter);
      }
      const url = `/products/export${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setSuccessMessage(
        `Successfully exported ${videos.length} product${videos.length !== 1 ? 's' : ''} to Excel.`
      );
    } catch (err: any) {
      console.error('Error exporting products:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('sessionId');
        navigate('/login');
        return;
      }
      const message = await parseBlobError(err);
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };
  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('active');
    setCategoryFilter('');
    setIsFilterDrawerOpen(false);
  };
  const applyFilters = () => {
    setIsFilterDrawerOpen(false);
    setIsFiltering(true);
  };
  const hasActiveFilters = searchTerm || statusFilter !== 'active' || categoryFilter;
  // Detect if mobile (breakpoint md: 768px)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }
  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Videos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {videos.length} product{videos.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            disabled={isExporting || videos.length === 0}
            className="group flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            title="Export all products to Excel with full details (ID, Name, SKU, Price, Category, Dimensions, Video URL, etc.)"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                Export to Excel
              </>
            )}
          </button>
          <Link to="/create-product" className="btn-primary flex items-center gap-2">
            <PlusCircle size={20} /> Create New Video
          </Link>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-500 hover:text-green-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {/* Desktop Filter Bar - hidden on mobile */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex-1 w-full relative">
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsFiltering(true);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setIsFiltering(true);
                }}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white text-sm"
              >
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setIsFiltering(true);
                }}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white text-sm"
                disabled={categoriesLoading}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-sm text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors whitespace-nowrap"
            >
              Clear
            </button>
          </div>
        </div>
        {isFiltering && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            <span>Filtering...</span>
          </div>
        )}
      </div>
      {/* Mobile: Floating Filter Button */}
      {isMobile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4">
          <button
            ref={filterButtonRef}
            onClick={() => setIsFilterDrawerOpen(true)}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-full shadow-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <Filter size={20} />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 bg-white text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {[searchTerm ? 1 : 0, statusFilter !== 'active' ? 1 : 0, categoryFilter ? 1 : 0].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        </div>
      )}
      {/* Mobile Filter Drawer */}
      {isMobile && isFilterDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white text-sm"
              >
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white text-sm"
                disabled={categoriesLoading}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
      {videos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play size={32} className="text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Videos Found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'active' || categoryFilter
              ? 'Try adjusting your filters'
              : 'Create your first product video to get started'}
          </p>
          {!searchTerm && statusFilter === 'active' && !categoryFilter && (
            <Link to="/create-product" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle size={20} /> Create Video
            </Link>
          )}
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
                  {!video.isActive && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-bold text-sm bg-red-600/80 px-3 py-1 rounded-full">Deleted</span>
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
                      disabled={isDeleting || !video.isActive}
                      className="flex items-center justify-center text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      title={video.isActive ? 'Delete product' : 'Already deleted'}
                    >
                      {isDeleting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
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
