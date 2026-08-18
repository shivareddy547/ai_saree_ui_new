import React, { useState, useEffect, useCallback } from 'react';
import NavContent from './NavContent';
import { LogOut, Sparkles } from 'lucide-react';
import axios from 'axios';
interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}
interface StoreSettings {
  id: string;
  name: string;
  caption: string | null;
  logo: string | null;
  favicon: string | null;
}
const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose, onLogout }) => {
  const [storeName, setStoreName] = useState('AI Saree');
  const [storeCaption, setStoreCaption] = useState('Video Generator');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const uploadsBase = apiBase.replace(/\/api$/, '');
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${uploadsBase}${path}`;
  };
  const fetchStoreSettings = useCallback(async () => {
    try {
      const api = axios.create({
        baseURL: apiBase,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        withCredentials: true,
      });
      const res = await api.get('/store-settings');
      const data: StoreSettings = res.data.data;
      if (data) {
        setStoreName(data.name || 'AI Saree');
        setStoreCaption(data.caption || 'Video Generator');
        setLogoUrl(getImageUrl(data.logo));
      }
    } catch {
      // Keep defaults on error
    }
  }, [apiBase]);
  useEffect(() => {
    fetchStoreSettings();
  }, [fetchStoreSettings]);
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={storeName}
            className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
          />
        ) : (
          <Sparkles className="w-10 h-10 text-purple-600 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-purple-700 truncate">{storeName}</h1>
          <p className="text-xs text-gray-500 truncate">{storeCaption}</p>
        </div>
      </div>
      {/* Navigation */}
      <NavContent isMobile={isMobile} onClose={onClose} />
      {/* Footer */}
      <div className="border-t border-gray-200 p-4 mt-auto">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all"
        >
          <LogOut className="w-5 h-5 mr-3 text-gray-400" />
          Logout
        </button>
      </div>
    </div>
  );
};
export default Sidebar;
