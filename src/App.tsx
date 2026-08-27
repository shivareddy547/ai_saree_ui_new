import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import Orders from './pages/Orders';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Analytics from './pages/Analytics';
import HelpUs from './pages/HelpUs';
import SetupProviders from './pages/SetupProviders';
import SocialPostVideoConfig from './pages/SocialPostVideoConfig';
import PaymentProvidersSetup from './pages/PaymentProvidersSetup';
import ShipmentProvidersSetup from './pages/ShipmentProvidersSetup';
import StoreSettingsAdmin from './pages/StoreSettingsAdmin';
import StorePageViews from './pages/StorePageViews';
import AIModelsSetup from './pages/AIModelsSetup'; // Import new page
import StoreHome from './pages/Store/StoreHome';
import StoreProducts from './pages/Store/StoreProducts';
import StoreProductDetail from './pages/Store/StoreProductDetail';
import StoreCart from './pages/Store/StoreCart';
import StoreCheckout from './pages/Store/StoreCheckout';
import StoreOrders from './pages/Store/StoreOrders';
import StoreOrderDetail from './pages/Store/StoreOrderDetail';
import StoreWishlist from './pages/Store/StoreWishlist';
import StoreSettings from './pages/Store/StoreSettings';
import StoreReturnPolicy from './pages/Store/StoreReturnPolicy';
import StoreManageAddresses from './pages/Store/StoreManageAddresses';
const OAuthCallbackHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      navigate(`/social-post-video-config?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, { replace: true });
    }
  }, [location, navigate]);
  return null;
};
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
    children, allowedRoles,
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
                    <ScrollToTop />
                    <Routes>
                        <Route path="/login" element={<LoginEmail />} />
                        <Route path="/signup" element={<SignupEmail />} />
                        <Route path="/login-otp" element={<LoginOTP />} />
                        <Route path="/signup-otp" element={<SignupOTP />} />
                        <Route path="/forgot-password" element={<ForgotPasswordEmail />} />
                        <Route path="/forgot-password-otp" element={<ForgotPasswordOTP />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/" element={<StoreLayout />}>
                            <Route index element={<StoreHome />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/create-product" element={<CreateProduct />} />
                            <Route path="/ai-generation" element={<AIVideoGeneration />} />
                            <Route path="/video-preview" element={<VideoPreview />} />
                            <Route path="/insta-preview" element={<InstagramPreview />} />
                            <Route path="/post-success" element={<PostSuccess />} />
                            <Route path="/all-videos" element={<AllVideos />} />
                            <Route path="/categories" element={<Categories />} />
                            <Route path="/orders" element={<Orders />} />
                            <Route path="/users" element={<Users />} />
                            <Route path="/users/:id" element={<UserDetail />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/store-page-views" element={<StorePageViews />} />
                            <Route path="/help-us" element={<HelpUs />} />
                            <Route path="/social-post-video-config" element={<SocialPostVideoConfig />} />
                            <Route path="/payment-providers-setup" element={<PaymentProvidersSetup />} />
                            <Route path="/shipment-providers-setup" element={<ShipmentProvidersSetup />} />
                            <Route path="/setup-providers" element={<SetupProviders />} />
                            <Route path="/ai-models-setup" element={<AIModelsSetup />} /> {/* New route */}
                            <Route path="/store-settings" element={<StoreSettingsAdmin />} />
                        </Route>
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
                            <Route path="manage-addresses" element={<StoreManageAddresses />} />
                            <Route path="settings" element={<StoreSettings />} />
                            <Route path="return-policy" element={<StoreReturnPolicy />} />
                        </Route>
                    </Routes>
                    <OAuthCallbackHandler />
                </Router>
            </WishlistProvider>
        </CartProvider>
    );
};
export default App;
