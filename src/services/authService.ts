import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic error handler to keep response shape consistent
const handleError = (err: any): { success: false; error: string } => {
    const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Something went wrong. Please try again.';
    return { success: false, error: message };
};

export interface SignupPayload {
    fullName: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export const signup = async (payload: SignupPayload): Promise<AuthResponse> => {
    try {
        const response = await axios.post(`${API_URL}/auth/signup`, payload);
        return { success: true, data: response.data };
    } catch (err: any) {
        return handleError(err);
    }
};

export const login = async (payload: { email: string; password: string }): Promise<AuthResponse> => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, payload);
        return { success: true, data: response.data };
    } catch (err: any) {
        return handleError(err);
    }
};

export const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    try {
        const response = await axios.post(`${API_URL}/auth/verify-otp`, { email, otp });
        return { success: true, data: response.data };
    } catch (err: any) {
        return handleError(err);
    }
};

export const resendOtp = async (email: string): Promise<AuthResponse> => {
    try {
        const response = await axios.post(`${API_URL}/auth/resend-otp`, { email });
        return { success: true, data: response.data };
    } catch (err: any) {
        return handleError(err);
    }
};
