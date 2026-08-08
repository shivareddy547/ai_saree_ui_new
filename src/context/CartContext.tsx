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
export interface CartItem {
  id: number; // cart item id
  productId: string;
  variantId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
}
interface CartContextType {
  items: CartItem[];
  addToCart: (product: { id: string; name: string; price: number; image: string; variantId: string }, quantity?: number) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isPopupOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;
  togglePopup: () => void;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const fetchCart = useCallback(async () => {
    try {
      const response = await apiClient.get('/cart');
      const data = response.data.data;
      const cartItems = data.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.product.name,
        price: parseFloat(item.variant.price),
        image: item.product.images && item.product.images.length > 0 ? item.product.images[0].url : '',
        quantity: item.quantity,
        color: item.variant.color || undefined,
        size: item.variant.size || undefined,
      }));
      setItems(cartItems);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    }
  }, []);
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);
  const addToCart = useCallback(async (product: { id: string; name: string; price: number; image: string; variantId: string }, quantity = 1) => {
    try {
      await apiClient.post('/cart/items', {
        productId: product.id,
        variantId: product.variantId,
        quantity,
      });
      await fetchCart();
      setIsPopupOpen(true);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  }, [fetchCart]);
  const removeFromCart = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/cart/items/${id}`);
      await fetchCart();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }, [fetchCart]);
  const updateQuantity = useCallback(async (id: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(id);
      return;
    }
    try {
      await apiClient.put(`/cart/items/${id}`, { quantity });
      await fetchCart();
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  }, [fetchCart, removeFromCart]);
  const clearCart = useCallback(async () => {
    try {
      for (const item of items) {
        await apiClient.delete(`/cart/items/${item.id}`);
      }
      await fetchCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  }, [items, fetchCart]);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const openPopup = useCallback(() => setIsPopupOpen(true), []);
  const closePopup = useCallback(() => setIsPopupOpen(false), []);
  const togglePopup = useCallback(() => setIsPopupOpen(prev => !prev), []);
  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      fetchCart,
      totalItems,
      totalPrice,
      isPopupOpen,
      openPopup,
      closePopup,
      togglePopup,
    }}>
      {children}
    </CartContext.Provider>
  );
};
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
