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

    // AUTH-001 Requirement 2: Session Validation
    // Check for existing valid session on component mount
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const sessionExpiry = localStorage.getItem('sessionExpiry');

        if (token && sessionExpiry) {
            const expiryTime = parseInt(sessionExpiry, 10);
            if (Date.now() < expiryTime && isTokenValid(token)) {
                // Session is still valid → redirect to dashboard
                navigate('/dashboard');
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
                // Extract user data from the nested structure
                const userData = response.data?.data;

                // Step 1: Ensure token is present
                if (!userData?.token) {
                    setError('Authentication failed. No token received. Please try again.');
                    return;
                }

                // Step 2: Ensure token is a non-empty string
                if (typeof userData.token !== 'string' || userData.token.trim() === '') {
                    setError('Authentication failed. No token received. Please try again.');
                    return;
                }

                // Step 3: Validate the token (e.g., JWT format and expiration)
                if (!isTokenValid(userData.token)) {
                    setError('Authentication failed. Invalid token received. Please try again.');
                    return;
                }

                // All validations passed → store session data
                localStorage.setItem('authToken', userData.token);

                // Store user details (including isEmailVerified)
                localStorage.setItem(
                    'user',
                    JSON.stringify({
                        id: userData.id,
                        fullName: userData.fullName,
                        email: userData.email,
                        isEmailVerified: userData.isEmailVerified ?? false,
                    })
                );

                // Set session expiry (30 minutes from now)
                const expiryTime = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;
                localStorage.setItem('sessionExpiry', expiryTime.toString());

                // Navigate to dashboard after successful authentication
                navigate('/dashboard');
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
                        src="https://images.unsplash.com/photo-1610030469983-9857967a0196?au&fit=crop&q=80&w=800"
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
