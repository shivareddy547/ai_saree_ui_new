import React from 'react';
import NavContent from './NavContent';
import { LogOut, Sparkles } from 'lucide-react';
interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
  onLogout?: () => void;
}
const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose, onLogout }) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200">
        <Sparkles className="w-8 h-8 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold text-purple-700">AI Saree</h1>
          <p className="text-xs text-gray-500">Video Generator</p>
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
