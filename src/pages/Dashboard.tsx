import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingBag, PlayCircle, PlusCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const sessionExpiry = localStorage.getItem('sessionExpiry');

    if (!token || !sessionExpiry) {
      navigate('/login');
      return;
    }

    const expiryTime = parseInt(sessionExpiry, 10);
    if (Date.now() >= expiryTime) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionExpiry');
      localStorage.removeItem('sessionId');
      navigate('/login');
      return;
    }
  }, [navigate]);

  const stats = [
    { label: 'Total Videos', value: '128', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Views', value: '45.2k', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Conversion Rate', value: '8.7%', icon: ShoppingBag, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  const recentVideos = [
    { id: 1, name: 'Royal Banarasi Silk Saree', views: '12.5k', date: '2 days ago', status: 'Published', img: 'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200' },
    { id: 2, name: 'Kanjeevaram Gold Edition', views: '8.2k', date: '5 days ago', status: 'Published', img: 'https://images.unsplash.com/photo-1583391733956-37566673367c?w=200' },
    { id: 3, name: 'Floral Chiffon Saree', views: '4.1k', date: '1 week ago', status: 'Draft', img: 'https://images.unsplash.com/photo-1610030469983-9857967a0196?w=200' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <Link to="/create-product" className="btn-primary flex items-center gap-2">
          <PlusCircle size={20} /> Create New Video
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card-glass p-6 flex items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card-glass p-6">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Videos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentVideos.map((video) => (
            <div key={video.id} className="group relative rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-all">
              <img src={video.img} alt={video.name} className="w-full h-64 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end text-white">
                <p className="font-bold text-lg">{video.name}</p>
                <div className="flex justify-between items-center text-xs opacity-90 mt-1">
                  <span>{video.views} views</span>
                  <span>{video.date}</span>
                </div>
              </div>
              <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-medium">
                {video.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
