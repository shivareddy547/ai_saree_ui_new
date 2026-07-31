import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface PostToInstagramProps {
  isPosting: boolean;
  postSuccess: boolean;
  createError: string | null;
  productName: string;
  price: string;
  description: string;
  handlePostToInstagram: () => void;
  resetAllState: () => void;
  isEditMode?: boolean;
  videoUrl?: string | null;
}

const PostToInstagram: React.FC<PostToInstagramProps> = ({
  isPosting,
  postSuccess,
  createError,
  productName,
  price,
  description,
  handlePostToInstagram,
  resetAllState,
  isEditMode = false,
  videoUrl = null,
}) => {
  const [instagramStatus, setInstagramStatus] = useState<{
    connected: boolean;
    username?: string;
    accountType?: string;
    mediaCount?: number;
    error?: string;
  }>({ connected: false });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  
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
  
  const checkInstagramStatus = async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const response = await apiClient.get('/instagram/status');
      if (response.data.success) {
        setInstagramStatus(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to check Instagram status:', err);
      setStatusError(err.response?.data?.message || 'Failed to check Instagram connection');
      setInstagramStatus({ connected: false });
    } finally {
      setIsLoadingStatus(false);
    }
  };
  
  const disconnectInstagram = async () => {
    try {
      await apiClient.post('/instagram/disconnect');
      setInstagramStatus({ connected: false });
      setStatusError(null);
    } catch (err: any) {
      console.error('Failed to disconnect Instagram:', err);
      setStatusError(err.response?.data?.message || 'Failed to disconnect Instagram');
    }
  };
  
  const handleConnectInstagram = async () => {
    setConnectError(null);
    setIsConnecting(true);
    try {
      // Get OAuth URL
      const redirectUri = `https://6113-27-6-114-179.ngrok-free.app/instagram-callback`;
      const urlResponse = await apiClient.get('/instagram/oauth-url', {
        params: { redirectUri }
      });
      if (urlResponse.data.success) {
        // Store the redirect URI in session storage for callback
        sessionStorage.setItem('instagram_redirect_uri', redirectUri);
        // Redirect to Instagram OAuth
        window.location.href = urlResponse.data.data.url;
      }
    } catch (err: any) {
      console.error('Failed to get OAuth URL:', err);
      setConnectError(err.response?.data?.message || 'Failed to initiate Instagram connection');
      setIsConnecting(false);
    }
  };
  
  useEffect(() => {
    checkInstagramStatus();
  }, []);
  
  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');
      const redirectUri = sessionStorage.getItem('instagram_redirect_uri');
      
      if (error) {
        setConnectError(`Instagram authorization failed: ${error}`);
        setIsConnecting(false);
        return;
      }
      
      if (code && redirectUri) {
        try {
          setIsConnecting(true);
          const response = await apiClient.post('/instagram/connect', {
            code,
            redirectUri
          });
          if (response.data.success) {
            await checkInstagramStatus();
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err: any) {
          console.error('Failed to connect Instagram:', err);
          setConnectError(err.response?.data?.message || 'Failed to connect Instagram account');
        } finally {
          setIsConnecting(false);
          sessionStorage.removeItem('instagram_redirect_uri');
        }
      }
    };
    handleOAuthCallback();
  }, []);
  
  if (postSuccess) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-green-600">
          {isEditMode ? 'Product Updated Successfully!' : 'Product Created Successfully!'}
        </h3>
        <p className="text-gray-600">
          {isEditMode 
            ? 'Your product has been updated and is now ready to be posted.'
            : 'Your product has been created and is now ready to be posted.'
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetAllState}
            className="btn-primary flex items-center justify-center gap-2"
          >
            Create Another Product
          </button>
          <button
            onClick={handlePostToInstagram}
            disabled={!instagramStatus.connected}
            className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${
              !instagramStatus.connected ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            Post to Instagram
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
        <span className="w-6 h-6 flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </span>
        {isEditMode ? 'Update & Post to Instagram' : 'Post to Instagram'}
      </h2>
      
      {connectError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{connectError}</span>
        </div>
      )}
      
      {/* Instagram Connection Status */}
      <div className={`rounded-lg p-4 border ${
        instagramStatus.connected 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {isLoadingStatus ? (
              <Loader2 size={20} className="animate-spin text-purple-600" />
            ) : instagramStatus.connected ? (
              <>
                <CheckCircle size={20} className="text-green-600" />
                <div>
                  <p className="font-medium text-green-700">Connected to Instagram</p>
                  <p className="text-sm text-green-600">
                    @{instagramStatus.username || 'Unknown'} • {instagramStatus.accountType || 'Business'} • {instagramStatus.mediaCount || 0} posts
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-700">Not Connected</p>
                  <p className="text-sm text-yellow-600">
                    {statusError || 'Connect your Instagram account to post videos'}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {instagramStatus.connected ? (
              <button
                onClick={disconnectInstagram}
                className="text-sm text-red-600 hover:text-red-800 border border-red-300 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectInstagram}
                disabled={isConnecting}
                className="text-sm text-purple-600 hover:text-purple-800 border border-purple-300 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1"
              >
                {isConnecting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                {isConnecting ? 'Connecting...' : 'Connect Instagram'}
              </button>
            )}
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <ExternalLink size={14} />
              Open Instagram
            </a>
          </div>
        </div>
        {isConnecting && !instagramStatus.connected && (
          <div className="mt-2 text-sm text-purple-600 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Redirecting to Instagram for authorization...
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-3">
        <h3 className="font-medium text-slate-700">Product Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <span className="ml-2 font-medium">{productName || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500">Price:</span>
            <span className="ml-2 font-medium">₹{price || '0'}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500">Description:</span>
            <p className="mt-1 text-gray-700">{description || 'No description provided'}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-gray-500">Video:</span>
            <span className="ml-2 font-medium">{videoUrl ? '✅ Ready' : '❌ Not generated'}</span>
          </div>
        </div>
      </div>
      
      {createError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{createError}</span>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <button
          onClick={handlePostToInstagram}
          disabled={isPosting || !instagramStatus.connected || !videoUrl || isConnecting}
          className={`flex-1 btn-primary flex items-center justify-center gap-2 py-3 ${
            (!instagramStatus.connected || !videoUrl || isConnecting) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isPosting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              {isEditMode ? 'Updating...' : 'Creating...'}
            </>
          ) : isConnecting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              {isEditMode ? 'Update Product' : 'Create & Post'}
            </>
          )}
        </button>
        <button
          onClick={resetAllState}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Start Over
        </button>
      </div>
      
      {!instagramStatus.connected && !isConnecting && (
        <p className="text-sm text-yellow-600 text-center">
          ⚠️ Connect your Instagram account to enable posting
        </p>
      )}
      {!videoUrl && (
        <p className="text-sm text-yellow-600 text-center">
          ⚠️ Generate a video first before posting
        </p>
      )}
      {isConnecting && (
        <p className="text-sm text-purple-600 text-center">
          🔄 Please wait while we connect your Instagram account...
        </p>
      )}
    </div>
  );
};

export default PostToInstagram;
