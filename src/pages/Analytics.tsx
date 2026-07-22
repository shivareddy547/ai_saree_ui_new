import React from 'react';
import { TrendingUp, Users, Eye, ShoppingCart } from 'lucide-react';

const Analytics: React.FC = () => {
  const metrics = [
    { label: 'Total Reach', value: '45.2k', growth: '+12%', icon: Users, color: 'text-blue-600' },
    { label: 'Total Views', value: '2.8k', growth: '+5%', icon: Eye, color: 'text-purple-600' },
    { label: 'Conversion', value: '8.7%', growth: '+2%', icon: ShoppingCart, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Analytics Overview</h1>
        <select className="p-2 px-4 border rounded-lg bg-white text-slate-600 text-sm">
          <option>Last 30 Days</option>
          <option>Last 7 Days</option>
          <option>Custom Range</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m, i) => (
          <div key={i} className="card-glass p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl bg-gray-50 ${m.color}`}>
                <m.icon size={24} />
              </div>
              <span className="text-green-500 text-sm font-bold">{m.growth}</span>
            </div>
            <div>
              <p className="text-slate-500 text-sm">{m.label}</p>
              <p className="text-3xl font-bold text-slate-800">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card-glass p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-6">Views Over Time</h3>
          <div className="h-64 w-full bg-gray-50 rounded-xl flex items-end justify-around p-4 gap-2">
            {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
              <div key={i} className="w-full bg-purple-500 rounded-t-md transition-all hover:bg-purple-600" style={{height: `${h}%`}} />
            ))}
          </div>
          <div className="flex justify-around mt-4 text-xs text-slate-400">
            <span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span>
          </div>
        </div>

        <div className="card-glass p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-6">Top Performing Videos</h3>
          <div className="space-y-4">
            {[
              { name: 'Royal Banarasi', views: '12.5k', percentage: '80%' },
              { name: 'Kanjeevaram Gold', views: '8.2k', percentage: '60%' },
              { name: 'Floral Chiffon', views: '4.1k', percentage: '30%' },
            ].map((v, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{v.name}</span>
                  <span className="text-slate-500">{v.views} views</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{width: v.percentage}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
