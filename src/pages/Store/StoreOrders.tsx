import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck,
  ChevronRight,
  Eye,
  Calendar,
  ShoppingBag
} from 'lucide-react';

const StoreOrders: React.FC = () => {
  const orders = [
    {
      id: 'ORD-2026-001',
      date: '2026-01-15',
      total: 2499,
      status: 'Delivered',
      items: 2,
      image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=100&h=100&fit=crop',
      expectedDelivery: '2026-01-20',
    },
    {
      id: 'ORD-2026-002',
      date: '2026-01-10',
      total: 4598,
      status: 'Processing',
      items: 3,
      image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=100&h=100&fit=crop',
      expectedDelivery: '2026-01-18',
    },
    {
      id: 'ORD-2026-003',
      date: '2026-01-05',
      total: 1899,
      status: 'Shipped',
      items: 1,
      image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=100&h=100&fit=crop',
      expectedDelivery: '2026-01-12',
    },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Delivered':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-700', iconColor: 'text-green-500' };
      case 'Processing':
        return { icon: Clock, color: 'bg-yellow-100 text-yellow-700', iconColor: 'text-yellow-500' };
      case 'Shipped':
        return { icon: Truck, color: 'bg-blue-100 text-blue-700', iconColor: 'text-blue-500' };
      default:
        return { icon: Package, color: 'bg-gray-100 text-gray-700', iconColor: 'text-gray-500' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">My Orders</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: '12', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
          { label: 'Delivered', value: '8', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
          { label: 'Processing', value: '2', icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Shipped', value: '2', icon: Truck, color: 'bg-blue-100 text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-purple-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-600">No orders yet</h2>
          <p className="text-gray-400 mt-2">Start shopping to place your first order</p>
          <Link
            to="/store/products"
            className="inline-flex items-center gap-2 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            Shop Now
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div key={order.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={order.image}
                      alt={order.id}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <Link to={`/store/order/${order.id}`} className="font-semibold text-gray-900 hover:text-purple-600 transition-colors">
                        {order.id}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span>{order.items} items</span>
                        <span>•</span>
                        <span className="font-medium text-gray-900">₹{order.total}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.iconColor}`} />
                      {order.status}
                    </span>
                    {order.status !== 'Delivered' && (
                      <span className="text-xs text-gray-500">
                        Expected: {new Date(order.expectedDelivery).toLocaleDateString()}
                      </span>
                    )}
                    <Link
                      to={`/store/order/${order.id}`}
                      className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      View Details
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StoreOrders;
