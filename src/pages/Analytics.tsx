import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Eye,
  Video,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  BarChart3,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Link2,
  CheckCircle,
  LayoutDashboard,
  PlusCircle,
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
  size = 18,
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
  provider_type: string;
  name: string;
  provider_key?: string | null;
  is_enabled: boolean;
  credentials: Record<string, string>;
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
interface AnalyticsStats {
  totalVideos: number;
  totalViews: number;
  totalReach: number;
  conversionRate: string;
  publishedVideos: number;
  draftVideos: number;
  viewsGrowth: string;
  reachGrowth: string;
  conversionGrowth: string;
  avgViewsPerVideo: number;
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
interface TopVideo {
  id: string;
  name: string;
  views: number;
  percentage: number;
  imageUrl: string;
}
interface MonthlyView {
  month: string;
  views: number;
}
const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState<AnalyticsStats>({
    totalVideos: 0,
    totalViews: 0,
    totalReach: 0,
    conversionRate: '0%',
    publishedVideos: 0,
    draftVideos: 0,
    viewsGrowth: '+0%',
    reachGrowth: '+0%',
    conversionGrowth: '+0%',
    avgViewsPerVideo: 0,
  });
  const [topVideos, setTopVideos] = useState<TopVideo[]>([]);
  const [monthlyViews, setMonthlyViews] = useState<MonthlyView[]>([]);
  // Provider tabs
  const [enabledProviders, setEnabledProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<{ [providerId: string]: SocialConnection }>({});
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [providerStats, setProviderStats] = useState<ProviderLiveStats | null>(null);
  const [providerStatsLoading, setProviderStatsLoading] = useState(false);
  const [providerStatsError, setProviderStatsError] = useState<string | null>(null);
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
  const fetchAnalytics = async () => {
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
        const totalReach = Math.round(totalViews * 1.8);
        const conversionRate =
          totalVideos > 0 ? ((publishedVideos / totalVideos) * 100).toFixed(1) + '%' : '0%';
        const avgViewsPerVideo = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
        const viewsGrowth = totalViews > 0 ? '+12.5%' : '+0%';
        const reachGrowth = totalReach > 0 ? '+8.3%' : '+0%';
        const conversionGrowth = parseFloat(conversionRate) > 0 ? '+2.1%' : '+0%';
        setStats({
          totalVideos,
          totalViews,
          totalReach,
          conversionRate,
          publishedVideos,
          draftVideos,
          viewsGrowth,
          reachGrowth,
          conversionGrowth,
          avgViewsPerVideo,
        });
        const sortedVideos = [...productData]
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 5);
        const maxViews = sortedVideos.length > 0 ? sortedVideos[0].views || 0 : 1;
        setTopVideos(
          sortedVideos.map((video) => ({
            id: video.id,
            name: video.name,
            views: video.views || 0,
            percentage: maxViews > 0 ? ((video.views || 0) / maxViews) * 100 : 0,
            imageUrl:
              video.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200&h=200&fit=crop',
          }))
        );
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const baseViews = Math.max(1, Math.floor(totalViews / 12));
        const monthlyData: MonthlyView[] = [];
        for (let i = 0; i < 7; i++) {
          const monthIndex = (currentMonth - 6 + i + 12) % 12;
          const variation = 0.6 + Math.random() * 0.8;
          const views = Math.round(baseViews * variation * (1 + (i / 7) * 0.5));
          monthlyData.push({
            month: months[monthIndex],
            views: views > 0 ? views : Math.round(baseViews * 0.5),
          });
        }
        setMonthlyViews(monthlyData);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };
  const fetchSocialData = useCallback(async () => {
    setIsLoadingSocial(true);
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
    } finally {
      setIsLoadingSocial(false);
    }
  }, []);
  const fetchProviderStats = async (providerId: string) => {
    setProviderStatsLoading(true);
    setProviderStatsError(null);
    setProviderStats(null);
    try {
      const res = await apiClient.get(`/social/stats/${providerId}`);
      if (res.data.success) {
        setProviderStats(res.data.data);
        const d = res.data.data;
        if (d) {
          setConnections((prev) => ({
            ...prev,
            [providerId]: {
              ...(prev[providerId] || {
                id: '',
                providerId,
                providerType: d.providerKey || '',
              }),
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
      setProviderStatsError(err.response?.data?.message || 'Failed to load provider analytics');
    } finally {
      setProviderStatsLoading(false);
    }
  };
  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    setProviderStats(null);
    setProviderStatsError(null);
    if (tabId === 'overview') return;
    await fetchProviderStats(tabId);
  };
  useEffect(() => {
    fetchAnalytics();
    fetchSocialData();
  }, [fetchSocialData]);
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };
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
  const isOverview = activeTab === 'overview';
  const activeProvider = !isOverview
    ? enabledProviders.find((p) => p.id === activeTab)
    : null;
  const activeConnection = activeProvider ? connections[activeProvider.id] : null;
  const activeColors = activeProvider
    ? getProviderColor(activeProvider.provider_key)
    : { border: 'border-l-purple-500', bg: 'bg-purple-100', text: 'text-purple-600' };
  // Metrics depend on tab
  const displayTotalVideos = isOverview
    ? stats.totalVideos
    : providerStats?.totalVideos ?? 0;
  const displayTotalViews = isOverview
    ? stats.totalViews
    : providerStats?.totalViews ?? 0;
  const displayReach = isOverview
    ? stats.totalReach
    : Math.round((providerStats?.totalViews ?? 0) * 1.8);
  const displayConversion = isOverview
    ? stats.conversionRate
    : providerStats?.conversionRate ?? '0%';
  const displayAvgViews =
    isOverview
      ? stats.avgViewsPerVideo
      : displayTotalVideos > 0
      ? Math.round(displayTotalViews / displayTotalVideos)
      : 0;
  const metricCards = [
    {
      label: 'Total Reach',
      value:
        providerStatsLoading && !isOverview ? '…' : formatNumber(displayReach),
      growth: isOverview ? stats.reachGrowth : providerStats?.connected ? 'Live' : '—',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      isPositive: isOverview ? stats.reachGrowth !== '+0%' : !!providerStats?.connected,
      isSubText: !isOverview,
    },
    {
      label: 'Total Views',
      value:
        providerStatsLoading && !isOverview ? '…' : formatNumber(displayTotalViews),
      growth: isOverview
        ? stats.viewsGrowth
        : providerStats?.viewsNote || (providerStats?.connected ? 'From platform' : '—'),
      icon: Eye,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      isPositive: isOverview ? stats.viewsGrowth !== '+0%' : !!providerStats?.connected,
      isSubText: !isOverview,
    },
    {
      label: 'Conversion Rate',
      value: providerStatsLoading && !isOverview ? '…' : displayConversion,
      growth: isOverview ? stats.conversionGrowth : providerStats?.source || '—',
      icon: ShoppingCart,
      color: 'text-green-600',
      bg: 'bg-green-100',
      isPositive: isOverview ? stats.conversionGrowth !== '+0%' : !!providerStats?.connected,
      isSubText: !isOverview,
    },
    {
      label: 'Total Videos',
      value:
        providerStatsLoading && !isOverview
          ? '…'
          : displayTotalVideos.toString(),
      growth: isOverview
        ? `${stats.publishedVideos} published, ${stats.draftVideos} draft`
        : providerStats?.connected
        ? `From ${providerStats.source || 'platform'} API`
        : 'Connect to load',
      icon: Video,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      isPositive: true,
      isSubText: true,
    },
  ];
  const connectedCount = Object.values(connections).filter((c) => c.connected).length;
  return (
    <div className="space-y-5 sm:space-y-8 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Analytics Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track performance by product data or connected social accounts
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              fetchAnalytics();
              fetchSocialData();
              if (activeTab !== 'overview') {
                handleTabChange(activeTab);
              }
            }}
            className="btn-secondary flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1 sm:flex-none"
            disabled={loading || isLoadingSocial || providerStatsLoading}
          >
            {loading || isLoadingSocial || providerStatsLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>
          {isOverview && (
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="p-2 px-4 border rounded-lg bg-white text-slate-600 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent flex-1 sm:flex-none"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last 365 Days</option>
            </select>
          )}
        </div>
      </div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {/* Provider tabs */}
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
                        ? `border-current ${colors.text}`
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    <ProviderIcon providerKey={provider.provider_key} size={15} />
                    <span className="max-w-[100px] sm:max-w-none truncate">{provider.name}</span>
                    {isConnected ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"
                        title="Connected"
                      />
                    ) : (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0"
                        title="Not connected"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 space-y-5">
          {/* Provider connection banner */}
          {activeProvider && (
            <div
              className={`rounded-xl border-l-4 ${activeColors.border} bg-white/70 border border-gray-100 p-4`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl flex-shrink-0 ${
                      providerStats?.connected || activeConnection?.connected
                        ? activeColors.bg + ' ' + activeColors.text
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <ProviderIcon providerKey={activeProvider.provider_key} size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">
                      {activeProvider.name} Analytics
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {providerStatsLoading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" /> Fetching live stats…
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
                      ) : (
                        <span>
                          Not connected — connect the account to load platform videos & views
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {providerStats?.connected || activeConnection?.connected ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      Live data
                    </span>
                  ) : (
                    <Link
                      to="/social-post-video-config"
                      className="text-xs sm:text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                    >
                      <Link2 size={13} />
                      Connect Account
                    </Link>
                  )}
                </div>
              </div>
              {providerStatsError && (
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {providerStatsError}
                </p>
              )}
              {providerStats?.error && providerStats.connected === false && (
                <p className="mt-2 text-xs text-red-600">{providerStats.error}</p>
              )}
            </div>
          )}
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {metricCards.map((metric, idx) => {
              const IconComponent = metric.icon;
              return (
                <div key={idx} className="bg-white/60 border border-gray-100 rounded-xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
                  <div className={`${metric.bg} ${metric.color} p-2.5 sm:p-3 rounded-xl flex-shrink-0`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-500 text-xs sm:text-sm">{metric.label}</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 truncate">
                      {metric.value}
                    </p>
                    {metric.isSubText ? (
                      <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                        {metric.growth}
                      </p>
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5">
                        {metric.isPositive ? (
                          <ArrowUpRight size={14} className="text-green-500" />
                        ) : (
                          <ArrowDownRight size={14} className="text-red-500" />
                        )}
                        <span
                          className={`text-xs font-medium ${
                            metric.isPositive ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {metric.growth}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Overview-only: social accounts summary */}
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
                            connected
                              ? colors.bg + ' ' + colors.text
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          <ProviderIcon providerKey={p.provider_key} size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {connected
                              ? `@${c?.username || c?.accountId || 'Connected'}`
                              : 'Not connected — tap to load analytics'}
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
      {/* Charts — Overview only (product data) */}
      {isOverview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="card-glass p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base sm:text-lg text-slate-800 flex items-center gap-2">
                <BarChart3 size={18} className="text-purple-600" />
                Views Over Time
              </h3>
              <span className="text-xs text-slate-400">Last 7 months</span>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-purple-600" />
              </div>
            ) : monthlyViews.length > 0 ? (
              <>
                <div className="h-52 sm:h-64 w-full bg-gray-50 rounded-xl flex items-end justify-between p-3 sm:p-4 gap-1 sm:gap-2">
                  {monthlyViews.map((item, i) => {
                    const maxViews = Math.max(...monthlyViews.map((d) => d.views), 1);
                    const height = Math.max(5, (item.views / maxViews) * 100);
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1">
                        <div
                          className="w-full max-w-[40px] bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-md transition-all hover:from-purple-600 hover:to-purple-500 cursor-pointer"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-slate-400 font-medium">{item.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-4 text-xs text-slate-400">
                  <span>
                    Total: {formatNumber(monthlyViews.reduce((sum, d) => sum + d.views, 0))} views
                  </span>
                  <span>
                    Avg:{' '}
                    {formatNumber(
                      Math.round(
                        monthlyViews.reduce((sum, d) => sum + d.views, 0) / monthlyViews.length
                      )
                    )}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No data available</p>
              </div>
            )}
          </div>
          <div className="card-glass p-4 sm:p-6">
            <h3 className="font-bold text-base sm:text-lg text-slate-800 flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-purple-600" />
              Top Performing Videos
            </h3>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="animate-spin text-purple-600" />
              </div>
            ) : topVideos.length > 0 ? (
              <div className="space-y-4">
                {topVideos.map((video, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-medium text-sm text-slate-700 truncate">
                            {video.name}
                          </span>
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatNumber(video.views)} views
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          i === 0
                            ? 'bg-purple-600'
                            : i === 1
                            ? 'bg-purple-500'
                            : i === 2
                            ? 'bg-purple-400'
                            : 'bg-purple-300'
                        }`}
                        style={{ width: `${video.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No videos available</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Provider tab: quick platform summary */}
      {!isOverview && activeProvider && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-glass p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-orange-600">
              {providerStatsLoading ? '…' : displayTotalVideos}
            </p>
            <p className="text-xs text-slate-500 mt-1">Platform Videos</p>
          </div>
          <div className="card-glass p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-purple-600">
              {providerStatsLoading ? '…' : formatNumber(displayTotalViews)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Platform Views</p>
          </div>
          <div className="card-glass p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {providerStatsLoading ? '…' : formatNumber(displayAvgViews)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Avg Views/Video</p>
          </div>
          <div className="card-glass p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              {providerStatsLoading ? '…' : displayConversion}
            </p>
            <p className="text-xs text-slate-500 mt-1">Conversion / Eng.</p>
          </div>
        </div>
      )}
      {/* Recent Activity (always product-based) */}
      <div className="card-glass p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clock size={20} className="text-purple-600" />
            Recent Activity
          </h3>
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
      {/* Quick stats — Overview */}
      {isOverview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="card-glass p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.publishedVideos}</p>
            <p className="text-xs text-slate-500 mt-1">Published</p>
          </div>
          <div className="card-glass p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.draftVideos}</p>
            <p className="text-xs text-slate-500 mt-1">Drafts</p>
          </div>
          <div className="card-glass p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {formatNumber(stats.avgViewsPerVideo)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Avg Views/Video</p>
          </div>
          <div className="card-glass p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.totalVideos}</p>
            <p className="text-xs text-slate-500 mt-1">Total Videos</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default Analytics;
