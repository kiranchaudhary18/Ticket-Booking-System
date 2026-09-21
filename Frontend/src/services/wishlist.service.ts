import { apiClient } from './api-client';
import { WishlistItem } from '@/types/wishlist';

let wishlistCachePromise: Promise<WishlistItem[]> | null = null;

export const wishlistService = {
  /**
   * Get the current customer's wishlist.
   * Uses an in-memory promise cache to prevent redundant concurrent requests.
   */
  getWishlist: async (forceRefresh = false): Promise<WishlistItem[]> => {
    if (forceRefresh || !wishlistCachePromise) {
      wishlistCachePromise = apiClient.get('/api/events/wishlists/')
        .then((response: { data: WishlistItem[] }) => response.data)
        .catch((err: unknown) => {
          wishlistCachePromise = null;
          throw err;
        });
    }
    return wishlistCachePromise as Promise<WishlistItem[]>;
  },

  /**
   * Add an event to the wishlist.
   */
  addToWishlist: async (eventId: number): Promise<WishlistItem> => {
    const response = await apiClient.post('/api/events/wishlists/', { event: eventId });
    // Invalidate cache
    wishlistCachePromise = null;
    return response.data;
  },

  /**
   * Remove an item from the wishlist.
   * @param wishlistId The ID of the wishlist item (not the event ID)
   */
  removeFromWishlist: async (wishlistId: number): Promise<void> => {
    await apiClient.delete(`/api/events/wishlists/${wishlistId}/delete/`);
    // Invalidate cache
    wishlistCachePromise = null;
  }
};
