import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
}
interface CartContextType {
  items: CartItem[];
  addToCart: (product: { id: number; name: string; price: number; image: string }, quantity?: number) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
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
  const addToCart = useCallback((product: { id: number; name: string; price: number; image: string }, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else {
        return [...prev, { ...product, quantity }];
      }
    });
    setIsPopupOpen(true);
  }, []);
  const removeFromCart = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  const updateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  }, [removeFromCart]);
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);
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
