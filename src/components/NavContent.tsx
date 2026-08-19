import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  VideoIcon,
  BarChart3,
  HelpCircle,
  Grid3x3,
  Home,
  Package,
  ShoppingCart,
  Store,
  Menu,
  X,
  Settings,
  Share2,
  CreditCard,
  ClipboardList,
  Users,
  Truck
} from 'lucide-react';
interface NavContentProps {
  isMobile?: boolean;
  onClose?: () => void;
}
const NavContent: React.FC<NavContentProps> = ({ isMobile = false, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<string>('dashboard');
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/dashboard')) setActiveItem('dashboard');
    else if (path.includes('/create-product')) setActiveItem('create-product');
    else if (path.includes('/ai-generation')) setActiveItem('ai-generation');
    else if (path.includes('/all-videos')) setActiveItem('all-videos');
    else if (path.includes('/categories')) setActiveItem('categories');
    else if (path.includes('/orders')) setActiveItem('orders');
    else if (path.includes('/users')) setActiveItem('users');
    else if (path.includes('/analytics')) setActiveItem('analytics');
    else if (path.includes('/help-us')) setActiveItem('help-us');
    else if (path.includes('/social-post-video-config')) setActiveItem('social-post-video-config');
    else if (path.includes('/payment-providers-setup')) setActiveItem('payment-providers-setup');
    else if (path.includes('/shipment-providers-setup')) setActiveItem('shipment-providers-setup');
    else if (path.includes('/setup-providers')) setActiveItem('setup-providers');
    else if (path.includes('/store-settings')) setActiveItem('store-settings');
    else if (path.includes('/store')) setActiveItem('store');
    else setActiveItem('dashboard');
  }, [location.pathname]);
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'create-product', label: 'Create Product', icon: Package, path: '/create-product' },
    { id: 'ai-generation', label: 'AI Generation', icon: VideoIcon, path: '/ai-generation' },
    { id: 'all-videos', label: 'All videos', icon: Grid3x3, path: '/all-videos' },
    { id: 'categories', label: 'Categories', icon: Grid3x3, path: '/categories' },
    { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/orders' },
    { id: 'users', label: 'Users', icon: Users, path: '/users' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'help-us', label: 'Help Us', icon: HelpCircle, path: '/help-us' },
    { id: 'social-post-video-config', label: 'Social Post Video Config', icon: Share2, path: '/social-post-video-config' },
    { id: 'payment-providers-setup', label: 'Payment Providers Setup', icon: CreditCard, path: '/payment-providers-setup' },
    { id: 'shipment-providers-setup', label: 'Shipment providers Setup', icon: Truck, path: '/shipment-providers-setup' },
    { id: 'setup-providers', label: 'Setup SMTP or SMS Providers', icon: Settings, path: '/setup-providers' },
    { id: 'store-settings', label: 'Store Settings', icon: Settings, path: '/store-settings' },
    { id: 'store', label: 'Store', icon: Store, path: '/store/home' },
  ];
  const handleNavigation = (id: string, path: string) => {
    setActiveItem(id);
    navigate(path);
    if (isMobile && onClose) {
      onClose();
    }
  };
  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {menuItems.map((item) => {
        const isActive = activeItem === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.id, item.path)}
            className={`
              w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-purple-50 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }
              ${isMobile ? 'justify-start' : 'justify-start'}
            `}
          >
            <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
            <span className="flex-1 text-left">{item.label}</span>
            {isActive && (
              <div className="w-1 h-8 bg-purple-600 rounded-full"></div>
            )}
          </button>
        );
      })}
    </nav>
  );
};
export default NavContent;
