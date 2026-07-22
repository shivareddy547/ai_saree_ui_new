import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../../services/authService';

const SignupEmail: React.FC = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await signup({ fullName, email, password });

            if (response.success) {
                navigate('/signup-otp', { state: { email } });
            } else {
                setError(response.error || 'Signup failed. Please try again.');
            }
        } catch (err: any) {
            setError(err?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#F3F4F6] items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex">
                <div className="hidden md:block w-1/2 relative">
                    <img
                        src="https://images.unsplash.com/photo-1583391733956-37566673367c?auto=format&fit=crop&q=80&w=800"
                        className="h-full w-full object-cover"
                        alt="Fashion"
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
                        Create your account
                    </h2>

                    <p className="text-center text-slate-500 mb-8">
                        Join SareeVibe and expand your business
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email address
                            </label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="Enter your email address"
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
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full py-3 text-lg mt-4"
                            disabled={loading}
                        >
                            {loading ? 'Signing up...' : 'Sign Up'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-purple-600 font-bold hover:underline"
                            >
                                Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupEmail;
