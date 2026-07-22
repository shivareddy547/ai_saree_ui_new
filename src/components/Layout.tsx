import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Video, 
  Film, 
  BarChart3, 
  HelpCircle,
  Settings, 
  UserCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Create Product', path: '/create-product', icon: PlusCircle },
    { name: 'AI Video', path: '/ai-generation', icon: Video },
    { name: 'All Videos', path: '/all-videos', icon: Film },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Help Us', path: '/help-us', icon: HelpCircle },
  ];

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('sessionId');
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const NavContent = () => (
    <>
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-900 font-bold">S</span>
        </div>
        <span className="text-xl font-bold tracking-tight">SareeVibe</span>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            onClick={closeMobileMenu}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px] ${
              location.pathname === item.path ? 'bg-white/20 text-white' : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-indigo-800 space-y-2">
        <Link to="#" className="flex items-center gap-3 px-4 py-3 text-indigo-100 hover:bg-white/10 rounded-lg transition-colors min-h-[44px]">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
        <Link to="#" className="flex items-center gap-3 px-4 py-3 text-indigo-100 hover:bg-white/10 rounded-lg transition-colors min-h-[44px]">
          <UserCircle size={20} />
          <span>Account</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-500/10 rounded-lg transition-colors w-full text-left min-h-[44px]"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#F3F4F6]">
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2.5 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#312E81] text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
