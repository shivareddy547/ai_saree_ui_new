import React from 'react';
import { Sparkles } from 'lucide-react';

const AIVideoGeneration: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="card-glass p-12 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
            <Sparkles size={40} className="text-purple-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Welcome to AI Video Generation</h1>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Create stunning AI-generated videos for your products with ease.
          Get started by uploading your product details and let our AI do the magic.
        </p>
      </div>
    </div>
  );
};

export default AIVideoGeneration;
