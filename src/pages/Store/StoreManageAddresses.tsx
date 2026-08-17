import React from 'react';
import { MapPin } from 'lucide-react';
const StoreManageAddresses: React.FC = () => {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center">
        <MapPin className="w-10 h-10 text-purple-600" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Manage Addresses</h1>
      <p className="text-gray-500 text-lg max-w-md mx-auto">
        Here you can view, add, and manage your delivery addresses for a smoother shopping experience.
      </p>
    </div>
  );
};
export default StoreManageAddresses;
