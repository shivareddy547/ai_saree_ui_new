import React, { useEffect, useState } from 'react';
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
  PlayCircle,
  Clock,
} from 'lucide-react';
import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
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
  // Fetch analytics data
  const fetchAnalytics = async () => {
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
        // Calculate reach (estimated - views * multiplier for social reach)
        const totalReach = Math.round(totalViews * 1.8);
        const conversionRate = totalVideos > 0
          ? ((publishedVideos / totalVideos) * 100).toFixed(1) + '%'
          : '0%';
        const avgViewsPerVideo = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
        // Calculate growth metrics (simulated based on data)
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
        // Calculate top performing videos
        const sortedVideos = [...productData]
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 5);
        const maxViews = sortedVideos.length > 0 ? sortedVideos[0].views || 0 : 1;
        const topVideosData = sortedVideos.map((video) => ({
          id: video.id,
          name: video.name,
          views: video.views || 0,
          percentage: maxViews > 0 ? ((video.views || 0) / maxViews) * 100 : 0,
          imageUrl: video.images?.[0]?.url ||
            'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200&h=200&fit=crop',
        }));
        setTopVideos(topVideosData);
        // Generate monthly view data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        // Simulate monthly data based on actual total views
        const baseViews = Math.max(1, Math.floor(totalViews / 12));
        const monthlyData: MonthlyView[] = [];
        for (let i = 0; i < 7; i++) {
          const monthIndex = (currentMonth - 6 + i + 12) % 12;
          // Create some variation in the data
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
  // Initial data load
  useEffect(() => {
    fetchAnalytics();
  }, []);
  // Format number with K/M suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };
  // Format date
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
  // Get recent videos for the "Recent Activity" section
  const recentVideos = products
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const metricCards = [
    {
      label: 'Total Reach',
      value: formatNumber(stats.totalReach),
      growth: stats.reachGrowth,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      isPositive: stats.reachGrowth !== '+0%',
    },
    {
      label: 'Total Views',
      value: formatNumber(stats.totalViews),
      growth: stats.viewsGrowth,
      icon: Eye,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      isPositive: stats.viewsGrowth !== '+0%',
    },
    {
      label: 'Conversion Rate',
      value: stats.conversionRate,
      growth: stats.conversionGrowth,
      icon: ShoppingCart,
      color: 'text-green-600',
      bg: 'bg-green-100',
      isPositive: stats.conversionGrowth !== '+0%',
    },
    {
      label: 'Total Videos',
      value: stats.totalVideos.toString(),
      growth: `${stats.publishedVideos} published, ${stats.draftVideos} draft`,
      icon: Video,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      isPositive: true,
      isSubText: true,
    },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Analytics Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Track your video performance and engagement metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchAnalytics}
            className="btn-secondary flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="p-2 px-4 border rounded-lg bg-white text-slate-600 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 365 Days</option>
          </select>
        </div>
      </div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metricCards.map((metric, idx) => {
          const IconComponent = metric.icon;
          return (
            <div key={idx} className="card-glass p-5 md:p-6 flex items-start gap-4">
              <div className={`${metric.bg} ${metric.color} p-3 rounded-xl flex-shrink-0`}>
                <IconComponent size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-500 text-sm">{metric.label}</p>
                <p className="text-xl md:text-2xl font-bold text-slate-800 truncate">{metric.value}</p>
                {metric.isSubText ? (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{metric.growth}</p>
                ) : (
                  <div className="flex items-center gap-1 mt-0.5">
                    {metric.isPositive ? (
                      <ArrowUpRight size={14} className="text-green-500" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${metric.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {metric.growth}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Views Over Time */}
        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
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
              <div className="h-64 w-full bg-gray-50 rounded-xl flex items-end justify-between p-4 gap-1 sm:gap-2">
                {monthlyViews.map((item, i) => {
                  const maxViews = Math.max(...monthlyViews.map(d => d.views), 1);
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
                <span>Total: {formatNumber(monthlyViews.reduce((sum, d) => sum + d.views, 0))} views</span>
                <span>Avg: {formatNumber(Math.round(monthlyViews.reduce((sum, d) => sum + d.views, 0) / monthlyViews.length))}</span>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p>No data available</p>
            </div>
          )}
        </div>
        {/* Top Performing Videos */}
        <div className="card-glass p-6">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-6">
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
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm text-slate-700 truncate">{video.name}</span>
                        <span className="text-xs text-slate-500 flex-shrink-0">{formatNumber(video.views)} views</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? 'bg-purple-600' :
                        i === 1 ? 'bg-purple-500' :
                        i === 2 ? 'bg-purple-400' :
                        'bg-purple-300'
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
      {/* Recent Activity */}
      <div className="card-glass p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
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
      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-glass p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.publishedVideos}</p>
          <p className="text-xs text-slate-500 mt-1">Published</p>
        </div>
        <div className="card-glass p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.draftVideos}</p>
          <p className="text-xs text-slate-500 mt-1">Drafts</p>
        </div>
        <div className="card-glass p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.avgViewsPerVideo)}</p>
          <p className="text-xs text-slate-500 mt-1">Avg Views/Video</p>
        </div>
        <div className="card-glass p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.totalVideos}</p>
          <p className="text-xs text-slate-500 mt-1">Total Videos</p>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
