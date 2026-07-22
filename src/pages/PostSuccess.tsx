import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react';

const PostSuccess: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
      <div className="relative">
        <div className="absolute inset-0 animate-ping bg-green-100 rounded-full" />
        <div className="relative w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center">
          <CheckCircle size={48} />
        </div>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-800">Posted Successfully!</h1>
        <p className="text-slate-500 text-lg">Your video has been successfully posted to Instagram.</p>
      </div>

      <div className="flex gap-4">
        <Link to="/dashboard" className="p-4 px-6 border rounded-xl bg-white text-slate-600 hover:bg-gray-50 flex items-center gap-2 font-medium transition-all">
          <ArrowLeft size={20} /> Go to Dashboard
        </Link>
        <button className="btn-primary px-6 py-4 flex items-center gap-2 font-medium">
          <ExternalLink size={20} /> View on Instagram
        </button>
      </div>
    </div>
  );
};

export default PostSuccess;
