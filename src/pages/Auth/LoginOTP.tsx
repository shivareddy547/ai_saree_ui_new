import React from 'react';

const LoginOTP: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="card-glass p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login OTP</h2>
        <p className="text-gray-600 text-center">Enter the OTP sent to your email/phone.</p>
        <div className="mt-4">
          <input type="text" placeholder="Enter OTP" className="input-field" />
          <button className="btn-primary w-full mt-4">Verify OTP</button>
        </div>
      </div>
    </div>
  );
};

export default LoginOTP;
