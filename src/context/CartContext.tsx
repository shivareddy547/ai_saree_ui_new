import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
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
const GUEST_CART_KEY = 'guestCart';
export interface CartItem {
  id: number;
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
  addToCart: (
    product: { id: string; name: string; price: number; image: string; variantId: string },
    quantity?: number
  ) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  fetchCart: () => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  totalItems: number;
  totalPrice: number;
  isPopupOpen: boolean;
  openPopup: () => void;
  closePopup: () => void;
  togglePopup: () => void;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
const resolveCartItemPrice = (item: any): number => {
  if (item?.resolvedPrice != null) {
    const r = parseFloat(item.resolvedPrice);
    if (!isNaN(r) && r > 0) return r;
  }
  const variantPrice = item?.variant?.price != null ? parseFloat(item.variant.price) : NaN;
  if (!isNaN(variantPrice) && variantPrice > 0) return variantPrice;
  const basePrice = item?.product?.basePrice != null ? parseFloat(item.product.basePrice) : NaN;
  if (!isNaN(basePrice) && basePrice > 0) return basePrice;
  if (!isNaN(variantPrice)) return variantPrice;
  return 0;
};
const loadGuestCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const saveGuestCart = (items: CartItem[]) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
};
const clearGuestCartStorage = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
};
const isLoggedIn = () => !!localStorage.getItem('authToken');
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const mergingRef = useRef(false);
  const wasLoggedInRef = useRef(isLoggedIn());
  const mapServerCart = (data: any[]): CartItem[] => {
    return (data || []).map((item: any) => ({
      id: item.id,
      productId: item.productId || item.product?.id,
      variantId: item.variantId || item.variant?.id || '',
      name: item.product?.name || item.name || 'Product',
      price: resolveCartItemPrice(item),
      image:
        item.product?.images?.[0]?.url ||
        item.image ||
        'https://via.placeholder.com/150',
      quantity: item.quantity || 1,
      color: item.variant?.color,
      size: item.variant?.size,
    }));
  };
  /**
   * Push guest localStorage cart items to the server cart for the logged-in user,
   * then clear guest cart. Safe to call multiple times.
   */
  const mergeGuestCart = useCallback(async () => {
    if (!isLoggedIn() || mergingRef.current) return;
    const guestItems = loadGuestCart();
    if (!guestItems.length) return;
    mergingRef.current = true;
    try {
      for (const item of guestItems) {
        if (!item.productId) continue;
        try {
          await apiClient.post('/cart/items', {
            productId: item.productId,
            variantId: item.variantId || undefined,
            quantity: item.quantity || 1,
          });
        } catch (err) {
          console.error('Failed to merge cart item:', item.productId, err);
        }
      }
      clearGuestCartStorage();
    } finally {
      mergingRef.current = false;
    }
  }, []);
  const fetchCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setItems(loadGuestCart());
      return;
    }
    // Merge any guest items before loading server cart
    await mergeGuestCart();
    try {
      const response = await apiClient.get('/cart');
      const data = response.data.data || [];
      setItems(mapServerCart(data));
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setItems(loadGuestCart());
        return;
      }
      console.error('Failed to fetch cart:', error);
      setItems([]);
    }
  }, [mergeGuestCart]);
  // Initial load
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);
  // Detect login transition (token appears) and merge + refresh cart
  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = isLoggedIn();
      if (loggedIn && !wasLoggedInRef.current) {
        // Just logged in → merge guest cart into server
        fetchCart();
      } else if (!loggedIn && wasLoggedInRef.current) {
        // Logged out → show guest cart
        setItems(loadGuestCart());
      }
      wasLoggedInRef.current = loggedIn;
    };
    // Poll lightly for auth changes (login pages set localStorage)
    const interval = setInterval(checkAuth, 500);
    window.addEventListener('storage', checkAuth);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAuth);
    };
  }, [fetchCart]);
  const addToCart = useCallback(
    async (
      product: { id: string; name: string; price: number; image: string; variantId: string },
      quantity = 1
    ) => {
      if (!isLoggedIn()) {
        setItems((prev) => {
          const existing = prev.find(
            (i) => i.productId === product.id && i.variantId === (product.variantId || '')
          );
          let next: CartItem[];
          if (existing) {
            next = prev.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
            );
          } else {
            const newItem: CartItem = {
              id: Date.now(),
              productId: product.id,
              variantId: product.variantId || '',
              name: product.name,
              price: product.price,
              image: product.image,
              quantity,
            };
            next = [...prev, newItem];
          }
          saveGuestCart(next);
          return next;
        });
        setIsPopupOpen(true);
        return;
      }
      try {
        await apiClient.post('/cart/items', {
          productId: product.id,
          variantId: product.variantId || undefined,
          quantity,
        });
        await fetchCart();
        setIsPopupOpen(true);
      } catch (error) {
        console.error('Failed to add to cart:', error);
        throw error;
      }
    },
    [fetchCart]
  );
  const removeFromCart = useCallback(
    async (id: number) => {
      if (!isLoggedIn()) {
        setItems((prev) => {
          const next = prev.filter((i) => i.id !== id);
          saveGuestCart(next);
          return next;
        });
        return;
      }
      try {
        await apiClient.delete(`/cart/items/${id}`);
        await fetchCart();
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    },
    [fetchCart]
  );
  const updateQuantity = useCallback(
    async (id: number, quantity: number) => {
      if (quantity <= 0) {
        await removeFromCart(id);
        return;
      }
      if (!isLoggedIn()) {
        setItems((prev) => {
          const next = prev.map((i) => (i.id === id ? { ...i, quantity } : i));
          saveGuestCart(next);
          return next;
        });
        return;
      }
      try {
        await apiClient.put(`/cart/items/${id}`, { quantity });
        await fetchCart();
      } catch (error) {
        console.error('Failed to update quantity:', error);
      }
    },
    [fetchCart, removeFromCart]
  );
  const clearCart = useCallback(async () => {
    if (!isLoggedIn()) {
      setItems([]);
      clearGuestCartStorage();
      return;
    }
    try {
      await apiClient.delete('/cart');
      clearGuestCartStorage();
      setItems([]);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  }, []);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const openPopup = useCallback(() => setIsPopupOpen(true), []);
  const closePopup = useCallback(() => setIsPopupOpen(false), []);
  const togglePopup = useCallback(() => setIsPopupOpen((prev) => !prev), []);
  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        fetchCart,
        mergeGuestCart,
        totalItems,
        totalPrice,
        isPopupOpen,
        openPopup,
        closePopup,
        togglePopup,
      }}
    >
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
