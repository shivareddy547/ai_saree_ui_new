import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, Share2, Scissors } from 'lucide-react';

const PlayIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const VideoPreview: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/ai-generation" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">Video Preview</h1>
        </div>
        <div className="flex gap-3">
          <button className="p-2 px-4 border rounded-lg bg-white text-slate-600 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
            <Scissors size={18} /> Trim Video
          </button>
          <button className="p-2 px-4 border rounded-lg bg-white text-slate-600 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
            <Download size={18} /> Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card-glass p-4 bg-black aspect-video relative group">
            <img 
              src="https://images.unsplash.com/photo-1610030469983-9857967a0196?w=800" 
              className="w-full h-full object-cover opacity-80" 
              alt="Video Preview" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                <PlayIcon />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card-glass p-6 space-y-6">
            <h3 className="font-bold text-xl text-slate-800">Video Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium">15 Seconds</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Resolution</span>
                <span className="font-medium">1080 x 1920 (9:16)</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Format</span>
                <span className="font-medium">MP4</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">File Size</span>
                <span className="font-medium">12.4 MB</span>
              </div>
            </div>
            <div className="pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Video Caption</label>
              <textarea 
                className="input-field h-24 text-sm" 
                defaultValue="Experience the elegance of Royal Banarasi Silk. Perfect for every occasion. ✨ #SareeLove #EthnicWear #LuxuryFashion"
              />
            </div>
          </div>
          <Link to="/insta-preview" className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-lg">
            Preview for Instagram <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;
