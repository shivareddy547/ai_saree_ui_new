import React from 'react';

const ForgotPasswordEmail: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6]">
      <div className="card-glass p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>
        <p className="text-gray-600 text-center">Enter your email to receive a password reset link.</p>
        <div className="mt-4">
          <input type="email" placeholder="Email address" className="input-field" />
          <button className="btn-primary w-full mt-4">Send Reset Link</button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordEmail;
