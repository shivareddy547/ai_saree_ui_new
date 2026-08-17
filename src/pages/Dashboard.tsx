import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  PlusCircle,
  RefreshCw,
  Eye,
  Calendar,
  Video,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  CheckCircle,
  Link2,
  Unlink,
  LayoutDashboard,
} from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
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

const ProviderIcon: React.FC<{ providerKey?: string | null; size?: number; className?: string }> = ({
  providerKey,
  size = 22,
  className = '',
}) => {
  if (providerKey === 'instagram') {
    return <InstagramIcon size={size} className={className} />;
  }
  return <Link2 size={size} className={className} />;
};

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

interface Provider {
  id: string;
  provider_type: 'social';
  name: string;
  provider_key?: string | null;
  is_enabled: boolean;
  credentials: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

interface SocialConnection {
  id: string;
  providerId: string;
  providerType: string;
  accountId?: string;
  username?: string;
  accountType?: string;
  tokenExpiresAt?: string;
  connected: boolean;
  error?: string;
}

interface DashboardStats {
  totalVideos: number;
  totalViews: number;
  conversionRate: string;
  publishedVideos: number;
  draftVideos: number;
}

interface ProviderLiveStats {
  providerId: string;
  providerKey?: string;
  providerName?: string;
  connected: boolean;
  username?: string | null;
  accountId?: string | null;
  tokenExpiresAt?: string | null;
  totalVideos: number;
  totalViews: number;
  conversionRate: string;
  publishedVideos?: number;
  draftVideos?: number;
  source?: string | null;
  error?: string | null;
  viewsNote?: string | null;
  mediaCount?: number;
}

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalVideos: 0,
    totalViews: 0,
    conversionRate: '0%',
    publishedVideos: 0,
    draftVideos: 0,
  });

  const [enabledProviders, setEnabledProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<{ [providerId: string]: SocialConnection }>({});
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoadingTabStatus, setIsLoadingTabStatus] = useState(false);
  const [providerStats, setProviderStats] = useState<ProviderLiveStats | null>(null);
  const [providerStatsLoading, setProviderStatsLoading] = useState(false);
  const [providerStatsError, setProviderStatsError] = useState<string | null>(null);

  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);

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

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/products');
      if (response.data.success) {
        const productData = response.data.data || [];
        setProducts(productData);
        const totalVideos = productData.length;
        const totalViews = productData.reduce((sum: number, p: Product) => sum + (p.views || 0), 0);
        const publishedVideos = productData.filter((p: Product) => p.status === 'published').length;
        const draftVideos = productData.filter((p: Product) => p.status === 'draft').length;
        const conversionRate =
          totalVideos > 0 ? ((publishedVideos / totalVideos) * 100).toFixed(1) + '%' : '0%';
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

  const fetchSocialData = useCallback(async () => {
    setIsLoadingSocial(true);
    setSocialError(null);
    try {
      const providersRes = await apiClient.get('/providers');
      const all = providersRes.data.data || [];
      const socialEnabled = all.filter(
        (p: any) => p.provider_type === 'social' && p.is_enabled === true
      );
      setEnabledProviders(socialEnabled);

      const statusRes = await apiClient.get('/social/status');
      if (statusRes.data.success) {
        const conns = statusRes.data.data || [];
        const map: { [id: string]: SocialConnection } = {};
        conns.forEach((c: any) => {
          map[c.providerId] = {
            id: c.id,
            providerId: c.providerId,
            providerType: c.providerType,
            accountId: c.accountId,
            username: c.username,
            accountType: c.accountType,
            tokenExpiresAt: c.tokenExpiresAt,
            connected: c.connected,
            error: c.error,
          };
        });
        setConnections(map);
      }
    } catch (err: any) {
      console.error('Failed to fetch social data:', err);
      setSocialError(err.response?.data?.message || 'Failed to load social integrations');
    } finally {
      setIsLoadingSocial(false);
    }
  }, []);

  // Fetch LIVE stats for a provider (uses access token on backend)
  const fetchProviderStats = async (providerId: string) => {
    setProviderStatsLoading(true);
    setProviderStatsError(null);
    setProviderStats(null);
    try {
      const res = await apiClient.get(`/social/stats/${providerId}`);
      if (res.data.success) {
        setProviderStats(res.data.data);
        // Also refresh connection map entry
        const d = res.data.data;
        if (d) {
          setConnections((prev) => ({
            ...prev,
            [providerId]: {
              ...(prev[providerId] || { id: '', providerId, providerType: d.providerKey || '' }),
              connected: d.connected,
              username: d.username,
              accountId: d.accountId,
              tokenExpiresAt: d.tokenExpiresAt,
              error: d.error,
            },
          }));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch provider stats:', err);
      setProviderStatsError(err.response?.data?.message || 'Failed to load provider stats');
    } finally {
      setProviderStatsLoading(false);
    }
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    setProviderStats(null);
    setProviderStatsError(null);

    if (tabId === 'overview') return;

    setIsLoadingTabStatus(true);
    try {
      // Refresh connection status
      try {
        const res = await apiClient.get(`/social/status/${tabId}`);
        if (res.data.success && res.data.data) {
          const c = res.data.data;
          setConnections((prev) => ({
            ...prev,
            [tabId]: {
              id: c.id,
              providerId: c.providerId || tabId,
              providerType: c.providerType,
              accountId: c.accountId,
              username: c.username,
              accountType: c.accountType,
              tokenExpiresAt: c.tokenExpiresAt,
              connected: c.connected,
              error: c.error,
            },
          }));
        }
      } catch {
        // ignore – still try stats
      }

      // Live platform stats (videos + views from Instagram/YouTube/etc.)
      await fetchProviderStats(tabId);
    } finally {
      setIsLoadingTabStatus(false);
    }
  };

  const disconnectSocial = async (connectionId: string) => {
    try {
      await apiClient.delete(`/social/disconnect/${connectionId}`);
      setConnectError(null);
      await fetchSocialData();
      if (activeTab !== 'overview') {
        await fetchProviderStats(activeTab);
      }
    } catch (err: any) {
      console.error('Failed to disconnect:', err);
      setConnectError(err.response?.data?.message || 'Failed to disconnect account');
    }
  };

  const openAuthPopup = async (providerId: string) => {
    setConnectError(null);
    setSocialError(null);
    setIsConnecting(providerId);
    try {
      const response = await apiClient.get(`/social/oauth-url/${providerId}`);
      if (response.data.success) {
        const url = response.data.data.url;
        setAuthUrl(url);
        setShowAuthModal(true);

        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          url,
          'social-auth',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`
        );
        if (!popup) {
          setConnectError('Please allow popups for this website to connect the account');
          setShowAuthModal(true);
          setIsConnecting(null);
          return;
        }
        setPopupWindow(popup);

        const checkPopup = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopup);
            setPopupWindow(null);
            setShowAuthModal(false);
            setIsConnecting(null);
            fetchSocialData().then(() => {
              if (activeTab === providerId) {
                handleTabChange(providerId);
              }
            });
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('Failed to get OAuth URL:', err);
      setConnectError(err.response?.data?.message || 'Failed to initiate connection');
      setIsConnecting(null);
    }
  };

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      if (errorParam) {
        setConnectError(`Authorization failed: ${errorParam}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        setShowAuthModal(false);
        if (popupWindow) {
          popupWindow.close();
          setPopupWindow(null);
        }
        setIsConnecting(null);
        return;
      }

      if (code && state) {
        window.history.replaceState({}, document.title, window.location.pathname);
        try {
          setIsConnecting(state);
          const response = await apiClient.post('/social/connect', { code, state });
          if (response.data.success) {
            await fetchSocialData();
            setShowAuthModal(false);
            setConnectError(null);
            if (popupWindow) {
              popupWindow.close();
              setPopupWindow(null);
            }
            setActiveTab(state);
            await fetchProviderStats(state);
          }
        } catch (err: any) {
          console.error('Failed to connect:', err);
          setConnectError(err.response?.data?.message || 'Failed to connect account');
        } finally {
          setIsConnecting(null);
        }
      }
    };
    handleOAuthCallback();
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchSocialData();
  }, [fetchSocialData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const recentVideos = products
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const connectedCount = Object.values(connections).filter((c) => c.connected).length;

  const getProviderColor = (key?: string | null) => {
    switch (key) {
      case 'instagram':
        return { border: 'border-l-pink-500', bg: 'bg-pink-100', text: 'text-pink-600' };
      case 'youtube':
        return { border: 'border-l-red-500', bg: 'bg-red-100', text: 'text-red-600' };
      case 'tiktok':
        return { border: 'border-l-slate-800', bg: 'bg-slate-100', text: 'text-slate-800' };
      case 'facebook':
        return { border: 'border-l-blue-600', bg: 'bg-blue-100', text: 'text-blue-600' };
      case 'linkedin':
        return { border: 'border-l-sky-700', bg: 'bg-sky-100', text: 'text-sky-700' };
      case 'twitter':
        return { border: 'border-l-sky-500', bg: 'bg-sky-100', text: 'text-sky-500' };
      default:
        return { border: 'border-l-purple-500', bg: 'bg-purple-100', text: 'text-purple-600' };
    }
  };

  // Stats cards: Overview = product DB; Provider tab = live platform stats
  const isOverview = activeTab === 'overview';
  const displayTotalVideos = isOverview
    ? stats.totalVideos
    : providerStats?.totalVideos ?? 0;
  const displayTotalViews = isOverview
    ? stats.totalViews
    : providerStats?.totalViews ?? 0;
  const displayConversion = isOverview
    ? stats.conversionRate
    : providerStats?.conversionRate ?? '0%';
  const displaySubVideos = isOverview
    ? `${stats.publishedVideos} published, ${stats.draftVideos} draft`
    : providerStats?.connected
    ? `From ${providerStats.source || 'platform'} API`
    : 'Connect account to load';

  const activeProvider =
    activeTab !== 'overview' ? enabledProviders.find((p) => p.id === activeTab) : null;
  const activeConnection = activeProvider ? connections[activeProvider.id] : null;
  const activeColors = activeProvider
    ? getProviderColor(activeProvider.provider_key)
    : { border: 'border-l-purple-500', bg: 'bg-purple-100', text: 'text-purple-600' };

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
      value: providerStatsLoading && !isOverview ? '…' : displayTotalVideos.toString(),
      icon: Video,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      subText: displaySubVideos,
    },
    {
      label: 'Total Views',
      value:
        providerStatsLoading && !isOverview
          ? '…'
          : displayTotalViews > 1000
          ? `${(displayTotalViews / 1000).toFixed(1)}k`
          : displayTotalViews.toString(),
      icon: Eye,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      subText: !isOverview && providerStats?.viewsNote ? providerStats.viewsNote : undefined,
    },
    {
      label: 'Conversion Rate',
      value: providerStatsLoading && !isOverview ? '…' : displayConversion,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-8 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your video products and social integrations
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              fetchProducts();
              fetchSocialData();
              if (activeTab !== 'overview') {
                handleTabChange(activeTab);
              }
            }}
            className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1 sm:flex-none"
            disabled={loading || isLoadingSocial || isLoadingTabStatus || providerStatsLoading}
          >
            {loading || isLoadingSocial || isLoadingTabStatus || providerStatsLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>
          <Link
            to="/create-product"
            className="btn-primary flex items-center justify-center gap-2 px-4 py-2 flex-1 sm:flex-none"
          >
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
          <span className="flex-1">{connectError}</span>
          <button onClick={() => setConnectError(null)} className="p-1 hover:bg-red-100 rounded">
            <X size={16} />
          </button>
        </div>
      )}
      {socialError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{socialError}</span>
        </div>
      )}

      {/* TABS */}
      <div className="card-glass p-0 overflow-hidden">
        <div className="border-b border-gray-100">
          <div className="flex overflow-x-auto scrollbar-hide gap-0 -mb-px">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                activeTab === 'overview'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard size={16} />
              Overview
            </button>

            {isLoadingSocial ? (
              <div className="flex items-center px-4 py-3 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin mr-2" />
                Loading…
              </div>
            ) : (
              enabledProviders.map((provider) => {
                const conn = connections[provider.id];
                const isConnected = conn?.connected === true;
                const isActive = activeTab === provider.id;
                const colors = getProviderColor(provider.provider_key);
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleTabChange(provider.id)}
                    className={`flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                      isActive
                        ? `border-current ${colors.text} bg-opacity-10`
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    <ProviderIcon providerKey={provider.provider_key} size={15} />
                    <span className="max-w-[100px] sm:max-w-none truncate">{provider.name}</span>
                    {isConnected ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="Connected" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" title="Not connected" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Connection status (provider tabs only) */}
          {activeProvider && (
            <div
              className={`rounded-xl border-l-4 ${activeColors.border} bg-white/70 border border-gray-100 p-4 sm:p-5`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl flex-shrink-0 ${
                      activeConnection?.connected || providerStats?.connected
                        ? activeColors.bg + ' ' + activeColors.text
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <ProviderIcon providerKey={activeProvider.provider_key} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 text-base sm:text-lg truncate">
                      {activeProvider.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {isLoadingTabStatus || providerStatsLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" /> Fetching live data…
                        </span>
                      ) : providerStats?.connected || activeConnection?.connected ? (
                        <span className="inline-flex items-center gap-1.5 text-green-600">
                          <CheckCircle size={13} />
                          Connected as @
                          {providerStats?.username ||
                            activeConnection?.username ||
                            activeConnection?.accountId ||
                            'Unknown'}
                        </span>
                      ) : providerStats?.error || activeConnection?.error ? (
                        <span className="text-red-500 line-clamp-1">
                          {providerStats?.error || activeConnection?.error}
                        </span>
                      ) : (
                        'Not connected — connect to load platform videos & views'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {providerStats?.connected || activeConnection?.connected ? (
                    <>
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Live
                      </span>
                      {activeConnection?.id && (
                        <button
                          onClick={() => disconnectSocial(activeConnection.id)}
                          className="text-xs sm:text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                        >
                          <Unlink size={13} /> Disconnect
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/create-product?step=5')}
                        className="btn-primary text-xs sm:text-sm px-3 py-1.5 flex items-center gap-1"
                      >
                        <PlusCircle size={13} /> Post Video
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openAuthPopup(activeProvider.id)}
                      disabled={isConnecting === activeProvider.id}
                      className="text-xs sm:text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isConnecting === activeProvider.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ProviderIcon providerKey={activeProvider.provider_key} size={14} />
                      )}
                      {isConnecting === activeProvider.id ? 'Connecting…' : 'Connect Account'}
                    </button>
                  )}
                </div>
              </div>

              {(providerStats?.tokenExpiresAt || activeConnection?.tokenExpiresAt) && (
                <p className="mt-3 text-[10px] sm:text-xs text-slate-400 border-t border-gray-100 pt-2">
                  Token expires:{' '}
                  {new Date(
                    providerStats?.tokenExpiresAt || activeConnection!.tokenExpiresAt!
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          )}

          {/* Stats: Total Videos / Total Views / Conversion Rate */}
          <div>
            {!isOverview && (
              <p className="text-xs text-slate-400 mb-2">
                {providerStatsLoading
                  ? 'Loading live stats from platform…'
                  : providerStats?.connected
                  ? `Live data from ${activeProvider?.name || 'provider'} (via access token)`
                  : 'Connect the account to fetch Total Videos, Views and Conversion from the platform'}
              </p>
            )}
            {providerStatsError && !isOverview && (
              <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {providerStatsError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {statCards.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white/60 border border-gray-100 rounded-xl p-4 flex items-start gap-3"
                  >
                    <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl flex-shrink-0`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-500 text-xs">{stat.label}</p>
                      <p className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                        {stat.value}
                      </p>
                      {stat.subText && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{stat.subText}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overview: connection summary */}
          {isOverview && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                Social Accounts ({connectedCount}/{enabledProviders.length} connected)
              </h4>
              {enabledProviders.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <Link2 size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm mb-3">No social providers enabled</p>
                  <Link
                    to="/social-post-video-config"
                    className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <PlusCircle size={14} /> Configure Providers
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enabledProviders.map((p) => {
                    const c = connections[p.id];
                    const connected = c?.connected === true;
                    const colors = getProviderColor(p.provider_key);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleTabChange(p.id)}
                        className={`text-left p-3 rounded-xl border border-gray-100 hover:shadow-sm transition-all flex items-center gap-3 ${
                          connected ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            connected ? colors.bg + ' ' + colors.text : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <ProviderIcon providerKey={p.provider_key} size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {connected
                              ? `@${c?.username || c?.accountId || 'Connected'}`
                              : 'Not connected'}
                          </p>
                        </div>
                        {connected ? (
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
                            Live
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                            Connect
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Videos */}
      <div className="card-glass p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800">Recent Videos</h3>
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
            <Link
              to="/create-product"
              className="text-sm text-purple-600 hover:text-purple-800 font-medium mt-2 inline-block"
            >
              Create your first video →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {recentVideos.map((video) => {
              const imageUrl =
                video.images?.[0]?.url ||
                'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200&h=200&fit=crop';
              return (
                <Link
                  key={video.id}
                  to={`/create-product?edit=${video.id}`}
                  className="group relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 bg-white"
                >
                  <div className="relative h-44 sm:h-52 overflow-hidden bg-gray-100">
                    <img
                      src={imageUrl}
                      alt={video.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200&h=200&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                      <p className="font-bold text-sm sm:text-base leading-tight line-clamp-2">
                        {video.name}
                      </p>
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
                    <span
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full backdrop-blur-md ${
                        video.status === 'published'
                          ? 'bg-green-500/80 text-white'
                          : 'bg-yellow-500/80 text-white'
                      }`}
                    >
                      {video.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {video.cloudinaryVideoPublicId && (
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-blue-500/80 text-white backdrop-blur-md">
                        Cloudinary
                      </span>
                    )}
                  </div>
                  {video.variants && video.variants.length > 0 && (
                    <div className="absolute bottom-14 sm:bottom-16 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
                      ₹{Math.min(...video.variants.map((v) => v.price || 0))}
                    </div>
                  )}
                </Link>
              );
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
                  <Link2 size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Connect Account</h3>
                  <p className="text-sm text-gray-500">Authorize your social account</p>
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
                  setIsConnecting(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link2 size={28} className="text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">Redirecting to provider</h4>
              <p className="text-gray-600 text-sm mb-6">
                You will be redirected to authorize your account. Please allow popups if prompted.
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
                        'social-auth',
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
                  Open Login
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(authUrl).then(() => {
                      alert(
                        'Authorization URL copied to clipboard. You can paste it in a new tab to complete authentication.'
                      );
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
                  setIsConnecting(null);
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
            Completing authentication…
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
