import React, { useState, useRef, useEffect } from 'react';
import { Menu, User, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
interface HeaderProps {
  onMenuClick: () => void;
}
const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [showLogout, setShowLogout] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handleProfileClick = () => {
    // Only toggle on mobile (screen width < 768px)
    if (window.innerWidth < 768) {
      setShowLogout(prev => !prev);
    }
  };
  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-gray-100 relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleProfileClick}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Profile"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
            {/* Dropdown menu - visible only on mobile and when toggled */}
            {showLogout && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 md:hidden">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-all"
                >
                  <LogOut className="w-5 h-5 mr-3 text-gray-400" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
