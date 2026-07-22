import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../../services/authService';

const SignupOTP: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = (location.state as any)?.email;

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // If no email in state, redirect back to signup
    React.useEffect(() => {
        if (!email) {
            navigate('/signup', { replace: true });
        }
    }, [email, navigate]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            const response = await verifyOtp(email, otp);
            if (response.success) {
                navigate('/login', {
                    state: { successMessage: 'Email verified successfully. Please login.' },
                    replace: true,
                });
            } else {
                setError(response.error || 'OTP verification failed. Please try again.');
            }
        } catch (err: any) {
            setError(err?.message || 'OTP verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        setMessage(null);
        setResendLoading(true);

        try {
            const response = await resendOtp(email);
            if (response.success) {
                setMessage('A new OTP has been sent to your email.');
            } else {
                setError(response.error || 'Failed to resend OTP. Please try again.');
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setResendLoading(false);
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
                        Verify your email
                    </h2>

                    <p className="text-center text-slate-500 mb-2">
                        We've sent a 6-digit OTP to{' '}
                        <span className="font-semibold text-slate-700">{email}</span>
                    </p>

                    <p className="text-center text-slate-500 mb-8">
                        Enter the code below to verify your account.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg">
                            {message}
                        </div>
                    )}

                    <form className="space-y-4" onSubmit={handleVerify}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                OTP Code
                            </label>
                            <input
                                type="text"
                                className="input-field text-center text-lg tracking-widest"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                required
                                disabled={loading}
                                maxLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary w-full py-3 text-lg mt-4"
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-500">
                            Didn't receive the code?{' '}
                            <button
                                onClick={handleResend}
                                disabled={resendLoading}
                                className="text-purple-600 font-bold hover:underline"
                            >
                                {resendLoading ? 'Sending...' : 'Resend OTP'}
                            </button>
                        </p>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-slate-500">
                            <Link
                                to="/signup"
                                className="text-purple-600 font-bold hover:underline"
                            >
                                Back to Signup
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupOTP;
