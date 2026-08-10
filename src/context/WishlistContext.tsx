import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
interface WishlistContextType {
  wishlistCount: number;
  fetchWishlistCount: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<{ isWishlisted: boolean; count: number }>;
  isWishlisted: (productId: string) => Promise<boolean>;
}
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wishlistCount, setWishlistCount] = useState(0);
  const fetchWishlistCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/store/wishlist/count');
      if (response.data.success) {
        setWishlistCount(response.data.data.count);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist count:', error);
    }
  }, []);
  useEffect(() => {
    fetchWishlistCount();
  }, [fetchWishlistCount]);
  const toggleWishlist = useCallback(async (productId: string) => {
    try {
      const response = await apiClient.post('/store/wishlist/toggle', { productId });
      if (response.data.success) {
        const { isWishlisted, count } = response.data.data;
        setWishlistCount(count);
        return { isWishlisted, count };
      }
      throw new Error('Failed to toggle wishlist');
    } catch (error) {
      console.error('Toggle wishlist error:', error);
      throw error;
    }
  }, []);
  const isWishlisted = useCallback(async (productId: string) => {
    try {
      const response = await apiClient.get(`/store/wishlist/status/${productId}`);
      if (response.data.success) {
        return response.data.data.isWishlisted;
      }
      return false;
    } catch (error) {
      console.error('Check wishlist status error:', error);
      return false;
    }
  }, []);
  return (
    <WishlistContext.Provider value={{ wishlistCount, fetchWishlistCount, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
};
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
