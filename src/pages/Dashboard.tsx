import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  ShoppingBag, 
  PlayCircle, 
  PlusCircle, 
  RefreshCw, 
  Eye, 
  Calendar, 
  Video, 
  Loader2, 
  AlertCircle,
  X,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
// Custom Instagram icon as SVG component
const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);
interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  defaultSku: string;
  videoUrl: string;
  videoKitUrl: string;
  cloudinaryVideoPublicId: string;
  views: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  images: { url: string; position: number }[];
  variants: { price: number; size: string; color: string }[];
}
interface InstagramStatus {
  connected: boolean;
  username?: string;
  accountType?: string;
  mediaCount?: number;
  error?: string;
  accountId?: string;
  tokenExpiresAt?: string;
}
interface DashboardStats {
  totalVideos: number;
  totalViews: number;
  conversionRate: string;
  publishedVideos: number;
  draftVideos: number;
}
type IconComponent = React.ComponentType<{ size?: number; className?: string }>;
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus>({ connected: false });
  const [isLoadingInstagram, setIsLoadingInstagram] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalVideos: 0,
    totalViews: 0,
    conversionRate: '0%',
    publishedVideos: 0,
    draftVideos: 0,
  });
  // Instagram OAuth state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
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
  // Fetch products and stats
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/products');
      if (response.data.success) {
        const productData = response.data.data || [];
        setProducts(productData);
        // Calculate stats
        const totalVideos = productData.length;
        const totalViews = productData.reduce((sum: number, p: Product) => sum + (p.views || 0), 0);
        const publishedVideos = productData.filter((p: Product) => p.status === 'published').length;
        const draftVideos = productData.filter((p: Product) => p.status === 'draft').length;
        const conversionRate = totalVideos > 0 
          ? ((publishedVideos / totalVideos) * 100).toFixed(1) + '%'
          : '0%';
        setStats({
          totalVideos,
          totalViews,
          conversionRate,
          publishedVideos,
          draftVideos,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  // Fetch Instagram status
  const fetchInstagramStatus = async () => {
    setIsLoadingInstagram(true);
    setStatusError(null);
    try {
      const response = await apiClient.get('/instagram/status');
      if (response.data.success) {
        setInstagramStatus(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch Instagram status:', err);
      setInstagramStatus({ 
        connected: false, 
        error: err.response?.data?.message || 'Failed to check Instagram connection' 
      });
      setStatusError(err.response?.data?.message || 'Failed to check Instagram connection');
    } finally {
      setIsLoadingInstagram(false);
    }
  };
  // Disconnect Instagram
  const disconnectInstagram = async () => {
    try {
      await apiClient.post('/instagram/disconnect');
      setInstagramStatus({ connected: false });
      setStatusError(null);
      setConnectError(null);
    } catch (err: any) {
      console.error('Failed to disconnect Instagram:', err);
      setStatusError(err.response?.data?.message || 'Failed to disconnect Instagram');
    }
  };
  // Open Instagram OAuth popup
  const openAuthPopup = async () => {
    setConnectError(null);
    setStatusError(null);
    try {
      // Use environment variable for redirect URI, fallback to window origin
      const redirectUri = process.env.REACT_APP_INSTAGRAM_REDIRECT_URI || `${window.location.origin}/instagram-callback`;
      const urlResponse = await apiClient.get('/instagram/oauth-url', {
        params: { redirectUri }
      });
      if (urlResponse.data.success) {
        sessionStorage.setItem('instagram_redirect_uri', redirectUri);
        const authUrl = urlResponse.data.data.url;
        setAuthUrl(authUrl);
        setShowAuthModal(true);
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          authUrl,
          'instagram-auth',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`
        );
        if (!popup) {
          setConnectError('Please allow popups for this website to connect Instagram');
          setShowAuthModal(true);
          return;
        }
        setPopupWindow(popup);
        // Monitor popup close
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            setPopupWindow(null);
            setShowAuthModal(false);
            // Refresh status when popup closes
            fetchInstagramStatus();
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('Failed to get OAuth URL:', err);
      setConnectError(err.response?.data?.message || 'Failed to initiate Instagram connection');
    }
  };
  // Handle OAuth callback completion
  const handleAuthComplete = async (code: string) => {
    const redirectUri = sessionStorage.getItem('instagram_redirect_uri');
    if (!redirectUri) return;
    try {
      setIsConnecting(true);
      const response = await apiClient.post('/instagram/connect', {
        code,
        redirectUri
      });
      if (response.data.success) {
        await fetchInstagramStatus();
        setShowAuthModal(false);
        setConnectError(null);
        if (popupWindow) {
          popupWindow.close();
          setPopupWindow(null);
        }
        setStatusError(null);
      }
    } catch (err: any) {
      console.error('Failed to connect Instagram:', err);
      setConnectError(err.response?.data?.message || 'Failed to connect Instagram account');
    } finally {
      setIsConnecting(false);
      sessionStorage.removeItem('instagram_redirect_uri');
    }
  };
  // Handle OAuth callback from URL params (when popup redirects back)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      if (error) {
        setConnectError(`Instagram authorization failed: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowAuthModal(false);
        if (popupWindow) {
          popupWindow.close();
          setPopupWindow(null);
        }
        return;
      }
      if (code) {
        window.history.replaceState({}, document.title, window.location.pathname);
        await handleAuthComplete(code);
      }
    };
    handleOAuthCallback();
  }, []);
  // Initial data load
  useEffect(() => {
    fetchProducts();
    fetchInstagramStatus();
  }, []);
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  // Get recent videos (last 3)
  const recentVideos = products
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const statCards: Array<{
    label: string;
    value: string;
    icon: IconComponent;
    color: string;
    bg: string;
    subText?: string;
  }> = [
    { 
      label: 'Total Videos', 
      value: stats.totalVideos.toString(), 
      icon: Video, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      subText: `${stats.publishedVideos} published, ${stats.draftVideos} draft`
    },
    { 
      label: 'Total Views', 
      value: stats.totalViews > 1000 ? `${(stats.totalViews / 1000).toFixed(1)}k` : stats.totalViews.toString(), 
      icon: Eye, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100' 
    },
    { 
      label: 'Conversion Rate', 
      value: stats.conversionRate, 
      icon: TrendingUp, 
      color: 'text-green-600', 
      bg: 'bg-green-100' 
    },
    { 
      label: 'Instagram Status', 
      value: instagramStatus.connected ? 'Connected' : 'Not Connected', 
      icon: InstagramIcon, 
      color: instagramStatus.connected ? 'text-pink-600' : 'text-gray-400', 
      bg: instagramStatus.connected ? 'bg-pink-100' : 'bg-gray-100',
      subText: instagramStatus.connected 
        ? `@${instagramStatus.username || 'Unknown'} • ${instagramStatus.mediaCount || 0} posts` 
        : 'Connect to post videos'
    },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your video products and Instagram integration</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              fetchProducts();
              fetchInstagramStatus();
            }}
            className="btn-secondary flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            disabled={loading || isLoadingInstagram}
          >
            {loading || isLoadingInstagram ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>
          <Link to="/create-product" className="btn-primary flex items-center gap-2 px-4 py-2">
            <PlusCircle size={18} /> Create New Video
          </Link>
        </div>
      </div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {connectError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{connectError}</span>
        </div>
      )}
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((stat, idx) => {
          const IconComponent = stat.icon;
          return (
            <div key={idx} className="card-glass p-5 md:p-6 flex items-start gap-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl flex-shrink-0`}>
                <IconComponent size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-slate-500 text-sm">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
                {stat.subText && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{stat.subText}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Recent Videos */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">Recent Videos</h3>
          <Link to="/all-videos" className="text-sm text-purple-600 hover:text-purple-800 font-medium">
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={32} className="animate-spin text-purple-600" />
          </div>
        ) : recentVideos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <Video size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No videos created yet</p>
            <Link to="/create-product" className="text-sm text-purple-600 hover:text-purple-800 font-medium mt-2 inline-block">
              Create your first video →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {recentVideos.map((video) => {
              const imageUrl = video.images?.[0]?.url || 
                'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200&h=200&fit=crop';
              return (
                <Link 
                  key={video.id} 
                  to={`/create-product?edit=${video.id}`}
                  className="group relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 bg-white"
                >
                  <div className="relative h-52 overflow-hidden bg-gray-100">
                    <img 
                      src={imageUrl} 
                      alt={video.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200&h=200&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <p className="font-bold text-base leading-tight line-clamp-2">{video.name}</p>
                      <div className="flex items-center gap-3 text-xs opacity-80 mt-1">
                        <span className="flex items-center gap-1">
                          <Eye size={12} /> {video.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(video.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-md ${
                      video.status === 'published' 
                        ? 'bg-green-500/80 text-white' 
                        : 'bg-yellow-500/80 text-white'
                    }`}>
                      {video.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {video.cloudinaryVideoPublicId && (
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-blue-500/80 text-white backdrop-blur-md">
                        Cloudinary
                      </span>
                    )}
                  </div>
                  {video.variants && video.variants.length > 0 && (
                    <div className="absolute bottom-16 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                      ₹{Math.min(...video.variants.map(v => v.price || 0))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {/* Instagram Connection Status Card */}
      <div className="card-glass p-6 border-l-4 border-l-pink-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${instagramStatus.connected ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
              <InstagramIcon size={22} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Instagram Integration</h4>
              <p className="text-sm text-slate-500">
                {isLoadingInstagram ? (
                  'Checking connection...'
                ) : instagramStatus.connected ? (
                  `Connected as @${instagramStatus.username || 'Unknown'}`
                ) : (
                  instagramStatus.error || statusError || 'Not connected'
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {instagramStatus.connected ? (
              <>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
                <button
                  onClick={disconnectInstagram}
                  className="text-sm text-red-600 hover:text-red-800 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={() => {
                    navigate('/create-product?step=5');
                  }}
                  className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1"
                >
                  <PlusCircle size={14} />
                  Post to Instagram
                </button>
              </>
            ) : (
              <button
                onClick={openAuthPopup}
                disabled={isConnecting || isLoadingInstagram}
                className="text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <InstagramIcon size={14} />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Instagram'}
              </button>
            )}
          </div>
        </div>
        {instagramStatus.connected && instagramStatus.tokenExpiresAt && (
          <div className="mt-3 text-xs text-slate-400 border-t border-gray-100 pt-3">
            Token expires: {new Date(instagramStatus.tokenExpiresAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric' 
            })}
          </div>
        )}
      </div>
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <InstagramIcon size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Connect Instagram</h3>
                  <p className="text-sm text-gray-500">Authorize your Instagram account</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  if (popupWindow) {
                    popupWindow.close();
                    setPopupWindow(null);
                  }
                  setConnectError('Authentication cancelled');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <InstagramIcon size={32} className="text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">Redirecting to Instagram</h4>
              <p className="text-gray-600 text-sm mb-6">
                You'll be redirected to Instagram to authorize your account. 
                Please allow popups if prompted.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (authUrl) {
                      const width = 500;
                      const height = 700;
                      const left = window.screenX + (window.outerWidth - width) / 2;
                      const top = window.screenY + (window.outerHeight - height) / 2;
                      const popup = window.open(
                        authUrl,
                        'instagram-auth',
                        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`
                      );
                      if (!popup) {
                        setConnectError('Please allow popups for this website');
                        return;
                      }
                      setPopupWindow(popup);
                      setShowAuthModal(false);
                    }
                  }}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} />
                  Open Instagram Login
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(authUrl).then(() => {
                      alert('Authorization URL copied to clipboard. You can paste it in a new tab to complete authentication.');
                    }).catch(() => {
                      alert(`Please open this URL in your browser:\n\n${authUrl}`);
                    });
                  }}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Copy authorization URL
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-2xl">
              <p className="text-sm text-gray-500">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Secure connection
              </p>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  if (popupWindow) {
                    popupWindow.close();
                    setPopupWindow(null);
                  }
                  setConnectError('Authentication cancelled');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {isConnecting && (
        <div className="text-center py-2">
          <p className="text-sm text-purple-600 flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Completing authentication...
          </p>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
