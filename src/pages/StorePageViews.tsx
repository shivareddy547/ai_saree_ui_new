import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Eye,
  Users,
  UserX,
  Share2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Globe,
} from 'lucide-react';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
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
interface PageViewRow {
  id: string;
  path: string;
  totalViews: number;
  guestViews: number;
  registeredViews: number;
  providerViews: Record<string, number>;
  providerTotal: number;
  lastIpAddress?: string | null;
  lastCity?: string | null;
  lastRegion?: string | null;
  lastCountry?: string | null;
  lastCountryCode?: string | null;
  lastLocation?: string | null;
  lastViewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
const formatNumber = (n: number) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};
const StorePageViews: React.FC = () => {
  const [rows, setRows] = useState<PageViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const fetchPageViews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/store/page-views');
      if (response.data.success) {
        setRows(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to load page views');
      }
    } catch (err: any) {
      console.error('Failed to fetch page views:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to load page views'
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPageViews();
  }, []);
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.totalViews += row.totalViews || 0;
        acc.guestViews += row.guestViews || 0;
        acc.registeredViews += row.registeredViews || 0;
        acc.providerTotal += row.providerTotal || 0;
        return acc;
      },
      { totalViews: 0, guestViews: 0, registeredViews: 0, providerTotal: 0 }
    );
  }, [rows]);
  const toggleProviders = (id: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-8 px-1 sm:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Store Page Views
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Track guest, registered and provider traffic for every store page
            </p>
          </div>
        </div>
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5 sm:space-y-8 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Store Page Views
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track guest, registered and provider traffic for every store page — including visitor IP and location
          </p>
        </div>
        <button
          onClick={fetchPageViews}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Unable to load analytics</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={fetchPageViews}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white/80 backdrop-blur-sm border border-purple-100 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs sm:text-sm">Total Page Views</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">
                {formatNumber(totals.totalViews)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-orange-100 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <UserX className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs sm:text-sm">Guest Accesses</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">
                {formatNumber(totals.guestViews)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-green-100 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs sm:text-sm">Registered Users</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">
                {formatNumber(totals.registeredViews)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm border border-blue-100 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-xs sm:text-sm">Provider Accesses</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">
                {formatNumber(totals.providerTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Per-page table */}
      <div className="card-glass overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-slate-800">
            Views by Page
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Each row shows guest, registered-user and provider traffic, plus the last visitor IP and location
          </p>
        </div>
        {rows.length === 0 && !error ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-slate-600 font-medium">No page views recorded yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Views will appear here once visitors open any /store/* page
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 text-xs sm:text-sm text-slate-500 uppercase tracking-wider">
                  <th className="px-4 sm:px-6 py-3 font-medium">Page Path</th>
                  <th className="px-4 sm:px-6 py-3 font-medium text-right">Total</th>
                  <th className="px-4 sm:px-6 py-3 font-medium text-right">
                    Guests
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-medium text-right">
                    Registered
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-medium text-right">
                    Providers
                  </th>
                  <th className="px-4 sm:px-6 py-3 font-medium">Last IP / Location</th>
                  <th className="px-4 sm:px-6 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const isExpanded = expandedProviders.has(row.id);
                  const hasProviders =
                    row.providerViews &&
                    Object.keys(row.providerViews).length > 0;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-purple-50/40 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5">
                          <span className="font-mono text-sm text-slate-800 break-all">
                            {row.path}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right font-semibold text-slate-800">
                          {formatNumber(row.totalViews)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5 text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full text-sm font-medium">
                            {formatNumber(row.guestViews)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full text-sm font-medium">
                            {formatNumber(row.registeredViews)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full text-sm font-medium">
                            {formatNumber(row.providerTotal)}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5">
                          {row.lastIpAddress || row.lastLocation ? (
                            <div className="space-y-0.5 min-w-[140px]">
                              {row.lastIpAddress && (
                                <div className="flex items-center gap-1.5 text-sm text-slate-700 font-mono">
                                  <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                  {row.lastIpAddress}
                                </div>
                              )}
                              {row.lastLocation && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                                  {row.lastLocation}
                                </div>
                              )}
                              {row.lastViewedAt && (
                                <p className="text-[11px] text-slate-400 pl-5">
                                  {formatDate(row.lastViewedAt)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          {hasProviders && (
                            <button
                              onClick={() => toggleProviders(row.id)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-slate-500"
                              aria-label="Toggle provider breakdown"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasProviders && (
                        <tr className="bg-blue-50/40">
                          <td colSpan={7} className="px-4 sm:px-6 py-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(row.providerViews)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .map(([provider, count]) => (
                                  <span
                                    key={provider}
                                    className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-800 text-xs sm:text-sm font-medium px-3 py-1 rounded-full shadow-sm"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    {provider}
                                    <span className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                                      {formatNumber(count as number)}
                                    </span>
                                  </span>
                                ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Legend */}
      <div className="bg-white/60 border border-gray-100 rounded-xl p-4 sm:p-5 text-sm text-slate-600">
        <p className="font-medium text-slate-800 mb-2">How counts are calculated</p>
        <ul className="space-y-1.5 list-disc list-inside">
          <li>
            <span className="font-medium text-orange-700">Guests</span> – visitors
            who are not logged in
          </li>
          <li>
            <span className="font-medium text-green-700">Registered users</span> –
            visitors with a valid login session (Total − Guests)
          </li>
          <li>
            <span className="font-medium text-blue-700">Providers</span> – visits
            that arrived with a <code className="bg-gray-100 px-1 rounded">?provider=…</code>{' '}
            query parameter (e.g. facebook, instagram). Expand a row to see the
            breakdown per provider.
          </li>
          <li>
            <span className="font-medium text-pink-700">IP / Location</span> – last
            visitor IP address and geolocation (city, region, country) resolved
            from that IP for the page.
          </li>
        </ul>
      </div>
    </div>
  );
};
export default StorePageViews;
