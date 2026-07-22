import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Mic, Play } from 'lucide-react';

const AIVideoGeneration: React.FC = () => {
  const [progress, setProgress] = useState(75);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/create-product" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">AI Video Generation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="card-glass p-6 space-y-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Sparkles size={20} className="text-purple-600" /> AI Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">AI Voice</label>
                <select className="input-field">
                  <option>Professional Female - Soft</option>
                  <option>Corporate Male - Deep</option>
                  <option>Enthusiastic Female - Bright</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Video Duration</label>
                <div className="flex gap-2">
                  {['15s', '30s', '60s'].map(t => (
                    <button key={t} className="flex-1 py-2 border rounded-lg hover:border-purple-500 hover:text-purple-600 transition-colors text-sm font-medium">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Visual Style</label>
                <select className="input-field">
                  <option>Cinematic Luxury</option>
                  <option>Modern Minimalist</option>
                  <option>Vibrant E-commerce</option>
                </select>
              </div>
            </div>

            <button className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <Play size={18} /> Regenerate Video
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card-glass overflow-hidden relative aspect-video bg-black group">
            <img 
              src="https://images.unsplash.com/photo-1610030469983-9857967a0196?w=800" 
              className="w-full h-full object-cover opacity-80" 
              alt="Preview" 
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform">
                <Play fill="white" size={32} />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm opacity-80">AI Generated Preview</p>
                  <p className="font-bold">Royal Banarasi Silk Saree</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80 mb-1">Generating... {progress}%</p>
                  <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{width: `${progress}%`}} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <Link to="/create-product" className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-2">
              <ArrowLeft size={18} /> Back to Product
            </Link>
            <Link to="/video-preview" className="btn-primary px-8 py-3 flex items-center gap-2">
              Preview Full Video <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIVideoGeneration;
