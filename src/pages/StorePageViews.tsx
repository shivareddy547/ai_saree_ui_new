import React from 'react';
const StorePageViews: React.FC = () => {
  return (
    <div className="space-y-5 sm:space-y-8 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Store Page Views</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome to the Store Page Views section!</p>
        </div>
      </div>
      {/* Welcome Card */}
      <div className="card-glass p-6 sm:p-10 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7C3AED"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Welcome!</h2>
          <p className="text-slate-600 text-base sm:text-lg mb-6">
            This is the Store Page Views section. Here you will be able to track and analyze
            page views for your store.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-slate-600 border border-gray-200">
              📊 Coming soon
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-slate-600 border border-gray-200">
              👀 Page view analytics
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm text-slate-600 border border-gray-200">
              📈 Visitor insights
            </div>
          </div>
        </div>
      </div>
      {/* Placeholder Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <div className="bg-white/60 border border-gray-100 rounded-xl p-4 sm:p-5">
          <p className="text-slate-500 text-xs sm:text-sm">Total Page Views</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">0</p>
        </div>
        <div className="bg-white/60 border border-gray-100 rounded-xl p-4 sm:p-5">
          <p className="text-slate-500 text-xs sm:text-sm">Unique Visitors</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">0</p>
        </div>
        <div className="bg-white/60 border border-gray-100 rounded-xl p-4 sm:p-5">
          <p className="text-slate-500 text-xs sm:text-sm">Avg. Time on Page</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">0m 0s</p>
        </div>
        <div className="bg-white/60 border border-gray-100 rounded-xl p-4 sm:p-5">
          <p className="text-slate-500 text-xs sm:text-sm">Bounce Rate</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800">0%</p>
        </div>
      </div>
    </div>
  );
};
export default StorePageViews;
