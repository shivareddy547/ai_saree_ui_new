import React from 'react';

const ResetPassword: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="card-glass p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
        <p className="text-gray-600 text-center">Enter your new password.</p>
        <div className="mt-4">
          <input type="password" placeholder="New password" className="input-field" />
          <input type="password" placeholder="Confirm password" className="input-field mt-3" />
          <button className="btn-primary w-full mt-4">Reset Password</button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
