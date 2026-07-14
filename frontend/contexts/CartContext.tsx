import React, { createContext, useContext, useMemo, useState } from 'react';
import { Post } from '@/services/api';

export interface CartItem {
  post: Post;
  quantityKg: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (post: Post, quantityKg: number) => void;
  removeItem: (postId: number) => void;
  clear: () => void;
  totalItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (post: Post, quantityKg: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.post.id === post.id);
      if (existing) {
        return prev.map((i) =>
          i.post.id === post.id ? { ...i, quantityKg } : i,
        );
      }
      return [...prev, { post, quantityKg }];
    });
  };

  const removeItem = (postId: number) => {
    setItems((prev) => prev.filter((i) => i.post.id !== postId));
  };

  const clear = () => setItems([]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      clear,
      totalItems: items.length,
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
