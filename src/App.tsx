import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import Layout from './components/Layout';
import StoreLayout from './components/StoreLayout';
import LoginEmail from './pages/Auth/LoginEmail';
import SignupEmail from './pages/Auth/SignupEmail';
import LoginOTP from './pages/Auth/LoginOTP';
import SignupOTP from './pages/Auth/SignupOTP';
import ForgotPasswordEmail from './pages/Auth/ForgotPasswordEmail';
import ForgotPasswordOTP from './pages/Auth/ForgotPasswordOTP';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import CreateProduct from './pages/CreateProduct';
import AIVideoGeneration from './pages/AIVideoGeneration';
import VideoPreview from './pages/VideoPreview';
import InstagramPreview from './pages/InstagramPreview';
import PostSuccess from './pages/PostSuccess';
import AllVideos from './pages/AllVideos';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import HelpUs from './pages/HelpUs';
import SetupProviders from './pages/SetupProviders';
import StoreHome from './pages/Store/StoreHome';
import StoreProducts from './pages/Store/StoreProducts';
import StoreProductDetail from './pages/Store/StoreProductDetail';
import StoreCart from './pages/Store/StoreCart';
import StoreCheckout from './pages/Store/StoreCheckout';
import StoreOrders from './pages/Store/StoreOrders';
import StoreOrderDetail from './pages/Store/StoreOrderDetail';
import StoreWishlist from './pages/Store/StoreWishlist';
import StoreSettings from './pages/Store/StoreSettings';
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
    children,
    allowedRoles,
}) => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    const navigate = useNavigate();
    if (!token) {
        return <Navigate to="/login" />;
    }
    let userRole = 'user';
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            userRole = user.role || 'user';
        } catch (err) {
            console.error('Failed to parse user:', err);
        }
    }
    if (!allowedRoles.includes(userRole)) {
        if (userRole === 'user' && allowedRoles.includes('admin')) {
            return <Navigate to="/store" />;
        }
        if (userRole === 'admin' && !allowedRoles.includes('admin')) {
            return <Navigate to="/dashboard" />;
        }
        return <Navigate to="/login" />;
    }
    return <>{children}</>;
};
const App: React.FC = () => {
    return (
        <CartProvider>
            <WishlistProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<LoginEmail />} />
                        <Route path="/signup" element={<SignupEmail />} />
                        <Route path="/login-otp" element={<LoginOTP />} />
                        <Route path="/signup-otp" element={<SignupOTP />} />
                        <Route path="/forgot-password" element={<ForgotPasswordEmail />} />
                        <Route path="/forgot-password-otp" element={<ForgotPasswordOTP />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        {/* Admin routes - protected */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <Layout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/dashboard" />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="create-product" element={<CreateProduct />} />
                            <Route path="ai-generation" element={<AIVideoGeneration />} />
                            <Route path="video-preview" element={<VideoPreview />} />
                            <Route path="insta-preview" element={<InstagramPreview />} />
                            <Route path="post-success" element={<PostSuccess />} />
                            <Route path="all-videos" element={<AllVideos />} />
                            <Route path="categories" element={<Categories />} />
                            <Route path="analytics" element={<Analytics />} />
                            <Route path="help-us" element={<HelpUs />} />
                            <Route path="setup-providers" element={<SetupProviders />} />
                        </Route>
                        {/* Store routes - public (authentication handled inside components) */}
                        <Route path="/store" element={<StoreLayout />}>
                            <Route index element={<Navigate to="/store/home" />} />
                            <Route path="home" element={<StoreHome />} />
                            <Route path="products" element={<StoreProducts />} />
                            <Route path="product/:id" element={<StoreProductDetail />} />
                            <Route path="cart" element={<StoreCart />} />
                            <Route path="checkout" element={<StoreCheckout />} />
                            <Route path="orders" element={<StoreOrders />} />
                            <Route path="order/:id" element={<StoreOrderDetail />} />
                            <Route path="wishlist" element={<StoreWishlist />} />
                            <Route path="settings" element={<StoreSettings />} />
                        </Route>
                    </Routes>
                </Router>
            </WishlistProvider>
        </CartProvider>
    );
};
export default App;
