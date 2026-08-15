import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { KeyRound, Loader2, Store, ArrowLeft } from 'lucide-react';
import { getPostLoginRedirect, persistAuthSession } from '../../utils/authRedirect';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const LoginOTP: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail: string = (location.state as any)?.email || '';
  const from: string | undefined =
    (location.state as any)?.from ||
    (location.state as any)?.from?.pathname ||
    undefined;
  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  useEffect(() => {
    if (!email) {
      // No email in state — go back to email login, preserve from
      navigate('/login', { state: from ? { from } : undefined, replace: true });
    }
  }, [email, from, navigate]);
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !otp.trim()) {
      setError('Email and OTP are required');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/verify-otp`,
        { email: email.trim(), otp: otp.trim() },
        { withCredentials: true }
      );
      const { user } = persistAuthSession(response.data);
      const redirectTo = getPostLoginRedirect(user, from);
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid OTP. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      await axios.post(
        `${API_BASE_URL}/auth/resend-otp`,
        { email: email.trim() },
        { withCredentials: true }
      );
      setInfo('A new OTP has been sent to your email.');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to resend OTP.';
      setError(message);
    } finally {
      setResending(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify OTP</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Enter the code sent to <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 p-6 sm:p-8">
          <form onSubmit={handleVerify} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                {info}
              </div>
            )}
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                One-Time Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                  placeholder="Enter OTP"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() =>
                navigate('/login', { state: from ? { from } : undefined })
              }
              className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginOTP;
