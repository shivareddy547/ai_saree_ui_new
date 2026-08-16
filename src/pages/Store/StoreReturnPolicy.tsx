import React from 'react';

const StoreReturnPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Return Policy</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-700 text-lg">
          Welcome to our Return Policy page. We are committed to your satisfaction.
        </p>
        <p className="text-gray-600 mt-4">
          If you are not completely satisfied with your purchase, you may return it within 30 days of receipt for a full refund or exchange.
          Please ensure that the item is in its original condition and packaging.
        </p>
        <p className="text-gray-600 mt-4">
          For any questions regarding returns, please contact our support team.
        </p>
      </div>
    </div>
  );
};

export default StoreReturnPolicy;
