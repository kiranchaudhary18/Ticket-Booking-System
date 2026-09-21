"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { wishlistService } from "@/services/wishlist.service";
import { WishlistItem } from "@/types/wishlist";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  refreshWishlist: () => Promise<void>;
  addToWishlist: (eventId: number) => Promise<boolean>;
  removeFromWishlist: (wishlistId: number) => Promise<boolean>;
  checkIsWishlisted: (eventId: number) => WishlistItem | undefined;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [processingEvents, setProcessingEvents] = useState<Set<number>>(new Set());
  const [processingWishlists, setProcessingWishlists] = useState<Set<number>>(new Set());

  const isCustomer = isAuthenticated && user?.role === "CUSTOMER";

  const refreshWishlist = useCallback(async () => {
    if (!isCustomer) {
      setWishlistItems([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      // Ensure we hit the backend fresh
      const data = await wishlistService.getWishlist(true);
      setWishlistItems(data);
    } catch (err: unknown) {
      console.error("Wishlist context fetch error:", err);
      const axiosErr = err as { message?: string };
      setError(axiosErr.message || "Failed to load wishlist");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  // Load wishlist initially when user logs in
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshWishlist();
  }, [refreshWishlist]);

  const addToWishlist = async (eventId: number): Promise<boolean> => {
    if (!isCustomer) return false;
    if (processingEvents.has(eventId)) return false; // Prevent multiple simultaneous add requests
    if (wishlistItems.some(item => item.event.id === eventId)) return false; // Already in wishlist

    try {
      setProcessingEvents(prev => new Set(prev).add(eventId));
      
      // Backend source of truth
      const newItem = await wishlistService.addToWishlist(eventId);
      
      // Update local state for immediate UI consistency
      setWishlistItems(prev => [...prev, newItem]);
      return true;
    } catch (err: unknown) {
      console.error("Failed to add to wishlist:", err);
      const axiosErr = err as { response?: { data?: { detail?: string, non_field_errors?: string[] } } };
      toast({
        title: "Error",
        description: axiosErr.response?.data?.detail || axiosErr.response?.data?.non_field_errors?.[0] || "Failed to add to wishlist.",
        variant: "destructive"
      });
      return false;
    } finally {
      setProcessingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const removeFromWishlist = async (wishlistId: number): Promise<boolean> => {
    if (!isCustomer) return false;
    if (processingWishlists.has(wishlistId)) return false; // Prevent multiple simultaneous remove requests
    if (!wishlistItems.some(item => item.id === wishlistId)) return false; // Already removed

    try {
      setProcessingWishlists(prev => new Set(prev).add(wishlistId));

      // Backend source of truth
      await wishlistService.removeFromWishlist(wishlistId);
      
      // Update local state for immediate UI consistency
      setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
      return true;
    } catch (err: unknown) {
      console.error("Failed to remove from wishlist:", err);
      const axiosErr = err as { response?: { status?: number, data?: { detail?: string } } };
      
      // If backend says 404, it's already removed. We should sync the UI.
      if (axiosErr.response?.status === 404) {
        setWishlistItems(prev => prev.filter(item => item.id !== wishlistId));
        return true;
      }

      toast({
        title: "Error",
        description: axiosErr.response?.data?.detail || "Failed to remove from wishlist.",
        variant: "destructive"
      });
      return false;
    } finally {
      setProcessingWishlists(prev => {
        const next = new Set(prev);
        next.delete(wishlistId);
        return next;
      });
    }
  };

  const checkIsWishlisted = useCallback((eventId: number) => {
    return wishlistItems.find((item) => item.event.id === eventId);
  }, [wishlistItems]);

  return (
    <WishlistContext.Provider 
      value={{ 
        wishlistItems, 
        isLoading, 
        error, 
        refreshWishlist, 
        addToWishlist, 
        removeFromWishlist,
        checkIsWishlisted
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlistContext() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlistContext must be used within a WishlistProvider");
  }
  return context;
}
