import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';
// Session timeout duration in minutes (as per AUTH-001: 30 minutes inactivity)
const SESSION_TIMEOUT_MINUTES = 30;
// Basic JWT validation – checks structure and expiration
const isTokenValid = (token: string): boolean => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1]));
        if (!payload) return false;
        // Check if token is expired
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
};
const LoginEmail: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    // Check for existing valid session on component mount
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        const userStr = localStorage.getItem('user');
        if (token && sessionExpiry) {
            const expiryTime = parseInt(sessionExpiry, 10);
            if (Date.now() < expiryTime && isTokenValid(token)) {
                // Session is still valid → redirect based on role
                const user = userStr ? JSON.parse(userStr) : null;
                console.log('[LoginEmail] Existing session user:', user);
                if (user?.role === 'admin') {
                    navigate('/dashboard');
                } else {
                    navigate('/store');
                }
            } else {
                // Session has expired or token invalid → clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                localStorage.removeItem('sessionExpiry');
                localStorage.removeItem('sessionId');
            }
        }
    }, [navigate]);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const response = await login({ email, password });
            if (response.success) {
                // response.data = { success: true, data: { user: {...}, token } }
                const result = response.data?.data;
                if (!result) {
                    setError('Invalid response from server. Please try again.');
                    return;
                }
                const user = result.user;
                const token = result.token;
                // Log the full response for debugging
                console.log('[LoginEmail] Full login response:', response.data);
                console.log('[LoginEmail] User object from backend:', user);
                // Step 1: Ensure token is present and valid
                if (!token || typeof token !== 'string' || token.trim() === '') {
                    setError('Authentication failed. No token received. Please try again.');
                    return;
                }
                if (!isTokenValid(token)) {
                    setError('Authentication failed. Invalid token received. Please try again.');
                    return;
                }
                // Store token
                localStorage.setItem('authToken', token);
                // Store user details (including role)
                const userData = {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified ?? false,
                    role: user.role || 'user',
                };
                localStorage.setItem('user', JSON.stringify(userData));
                // Set session expiry (30 minutes from now)
                const expiryTime = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;
                localStorage.setItem('sessionExpiry', expiryTime.toString());
                // Log stored user data
                console.log('[LoginEmail] Stored userData:', userData);
                // Navigate based on role
                const role = user.role || 'user';
                console.log('[LoginEmail] Role determined:', role);
                if (role === 'admin') {
                    navigate('/dashboard');
                } else {
                    navigate('/store');
                }
            } else {
                setError(response.error || 'Login failed. Please try again.');
            }
        } catch (err: any) {
            setError(err?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen flex bg-[#F3F4F6] items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex">
                <div className="hidden md:block w-1/2 relative">
                    <img
                        src="https://images.unsplash.com/photo-1610030469983-9857967a0196?auto=format&fit=crop&q=80&w=800"
                        className="h-full w-full object-cover"
                        alt="Saree Display"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-600 rounded-full" />
                            <span className="text-2xl font-bold text-slate-800">
                                SareeVibe
                            </span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-2 text-slate-800">
                        Welcome back!
                    </h2>
                    <p className="text-center text-slate-500 mb-8">
                        Login to your account
                    </p>
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email address
                            </label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="text-right">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-purple-600 hover:underline font-medium"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <button
                            type="submit"
                            className="btn-primary w-full py-3 text-lg mt-4"
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                    <div className="mt-8 text-center">
                        <p className="text-slate-500">
                            Don't have an account?{' '}
                            <Link
                                to="/signup"
                                className="text-purple-600 font-bold hover:underline"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default LoginEmail;
