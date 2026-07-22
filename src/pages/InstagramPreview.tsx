import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';

const InstagramPreview: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/video-preview" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">Instagram Preview</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-12 py-8">
        {/* Phone Mockup */}
        <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" />
          <div className="h-full w-full relative">
            <img 
              src="https://images.unsplash.com/photo-1610030469983-9857967a0196?w=400" 
              className="w-full h-full object-cover" 
              alt="Insta Preview" 
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden">
                  <img src="https://i.pravatar.cc/100" alt="user" />
                </div>
                <span className="text-xs font-bold">sareevibe_official</span>
              </div>
              <p className="text-xs line-clamp-2">Experience the elegance of Royal Banarasi Silk. Perfect for every occasion. ✨</p>
            </div>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <div className="card-glass p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="text-pink-600" size={24} />
              <h3 className="text-xl font-bold text-slate-800">Post Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Publish Date</label>
                <input type="datetime-local" className="input-field" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="checkbox" id="auto-publish" className="w-4 h-4 text-purple-600" />
                <label htmlFor="auto-publish" className="text-sm text-slate-600">Auto-publish to Instagram Reels</label>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <Link to="/post-success" className="btn-primary w-full py-4 block text-center text-lg">
                Publish Now
              </Link>
              <Link to="/video-preview" className="block text-center text-slate-500 text-sm hover:underline">
                Edit Video
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramPreview;
