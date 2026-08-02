import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ChevronLeft,
  Package,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Calendar,
  ShoppingBag,
  Download,
  Printer
} from 'lucide-react';

const StoreOrderDetail: React.FC = () => {
  const { id } = useParams();

  const order = {
    id: id || 'ORD-2026-001',
    date: '2026-01-15',
    total: 2499,
    status: 'Delivered',
    items: [
      { name: 'Designer Silk Saree', quantity: 1, price: 2499, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=100&h=100&fit=crop' },
      { name: 'Banarasi Silk Saree', quantity: 1, price: 3599, image: 'https://images.unsplash.com/photo-1610030469627-3b5e8e6c8d1f?w=100&h=100&fit=crop' },
    ],
    shippingAddress: '123 Main Street, Mumbai, Maharashtra 400001',
    expectedDelivery: '2026-01-20',
    trackingNumber: 'TRK-2026-001-456',
    paymentMethod: 'Credit Card',
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Delivered':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'Processing':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'Shipped':
        return { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' };
      default:
        return { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  // Order timeline
  const timeline = [
    { status: 'Order Placed', date: order.date, completed: true },
    { status: 'Processing', date: '2026-01-16', completed: order.status !== 'Processing' },
    { status: 'Shipped', date: '2026-01-17', completed: order.status === 'Delivered' || order.status === 'Shipped' },
    { status: 'Delivered', date: order.expectedDelivery, completed: order.status === 'Delivered' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/store/home" className="text-gray-500 hover:text-purple-600">Store</Link>
        <span className="text-gray-300">/</span>
        <Link to="/store/orders" className="text-gray-500 hover:text-purple-600">Orders</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{order.id}</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
          <p className="text-sm text-gray-500 mt-1">Order ID: {order.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${statusConfig.bg}`}>
                <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Order {order.status}</h3>
                {order.status === 'Delivered' ? (
                  <p className="text-sm text-green-600">Delivered on {new Date(order.expectedDelivery).toLocaleDateString()}</p>
                ) : (
                  <p className="text-sm text-gray-500">Expected delivery: {new Date(order.expectedDelivery).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-6 relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-4">
                {timeline.map((step, index) => (
                  <div key={index} className="flex items-start gap-4 relative">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${step.completed ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.status}
                      </p>
                      <p className={`text-sm ${step.completed ? 'text-gray-500' : 'text-gray-300'}`}>
                        {new Date(step.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
              Items
            </h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-purple-600">₹{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Summary */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100">
            <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{order.total}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (12%)</span>
                <span>₹{Math.round(order.total * 0.12)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-purple-600">₹{order.total + Math.round(order.total * 0.12)}</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Payment Method</span>
                  <span className="text-gray-900">{order.paymentMethod}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tracking</span>
                    <span className="text-purple-600 font-medium">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-purple-100">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Shipping Address
            </h3>
            <p className="text-gray-600 text-sm">{order.shippingAddress}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Ordered on {new Date(order.date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Support */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Need Help?</h4>
            <p className="text-xs text-gray-600">Contact our support team for assistance</p>
            <Link
              to="/help-us"
              className="inline-block mt-2 text-purple-600 text-sm font-medium hover:text-purple-700"
            >
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreOrderDetail;
