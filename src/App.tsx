import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
// Store Pages
import StoreHome from './pages/Store/StoreHome';
import StoreProducts from './pages/Store/StoreProducts';
import StoreProductDetail from './pages/Store/StoreProductDetail';
import StoreCart from './pages/Store/StoreCart';
import StoreCheckout from './pages/Store/StoreCheckout';
import StoreOrders from './pages/Store/StoreOrders';
import StoreOrderDetail from './pages/Store/StoreOrderDetail';
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginEmail />} />
        <Route path="/signup" element={<SignupEmail />} />
        <Route path="/login-otp" element={<LoginOTP />} />
        <Route path="/signup-otp" element={<SignupOTP />} />
        <Route path="/forgot-password" element={<ForgotPasswordEmail />} />
        <Route path="/forgot-password-otp" element={<ForgotPasswordOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Main App Routes with Sidebar */}
        <Route path="/" element={<Layout />}>
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
        </Route>
        {/* Store Routes with Store Layout - Only visible to logged-in users */}
        <Route path="/store" element={<StoreLayout />}>
          <Route index element={<Navigate to="/store/home" />} />
          <Route path="home" element={<StoreHome />} />
          <Route path="products" element={<StoreProducts />} />
          <Route path="product/:id" element={<StoreProductDetail />} />
          <Route path="cart" element={<StoreCart />} />
          <Route path="checkout" element={<StoreCheckout />} />
          <Route path="orders" element={<StoreOrders />} />
          <Route path="order/:id" element={<StoreOrderDetail />} />
        </Route>
      </Routes>
    </Router>
  );
};
export default App;
