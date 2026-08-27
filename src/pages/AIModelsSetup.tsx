import React from 'react';
import { Cpu } from 'lucide-react';
const AIModelsSetup: React.FC = () => {
  return (
    <div className="space-y-5 sm:space-y-8 px-1 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">AI Models Setup</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure and manage your AI models for video generation and other AI features.
        </p>
      </div>
      <div className="card-glass p-8 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Cpu className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Welcome to AI Models Setup</h2>
          <p className="text-slate-600">
            This section allows you to configure AI models for video generation,
            text-to-speech, and other AI-powered features.
            You can add API keys, select models, and manage AI providers.
          </p>
          <p className="text-slate-500 text-sm mt-4">
            More configuration options will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};
export default AIModelsSetup;
