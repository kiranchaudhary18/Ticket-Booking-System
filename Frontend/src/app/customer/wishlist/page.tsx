"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, AlertCircle, RefreshCw } from "lucide-react";

import { useWishlistContext } from "@/contexts/WishlistContext";
import { EventCard } from "@/components/events/EventCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Category, Venue } from "@/types/event";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function WishlistPage() {
  const { wishlistItems, isLoading, error, refreshWishlist, removeFromWishlist } = useWishlistContext();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWishlist();
    setIsRefreshing(false);
  };

  const handleRemove = async (wishlistId: number) => {
    setRemovingIds((prev) => new Set(prev).add(wishlistId));
    await removeFromWishlist(wishlistId);
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(wishlistId);
      return next;
    });
  };

  // Sort by recently added
  const sortedWishlistItems = [...wishlistItems].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Wishlist</h1>
          <p className="text-muted-foreground mt-2">Events you&apos;ve saved for later.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : sortedWishlistItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedWishlistItems.map((item) => (
            <EventCard 
              key={item.id} 
              event={item.event} 
              category={item.event.category as unknown as Category}
              venue={item.event.venue as unknown as Venue}
              actionSlot={
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                  onClick={() => handleRemove(item.id)}
                  disabled={removingIds.has(item.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {removingIds.has(item.id) ? "Removing..." : "Remove"}
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="h-12 w-12 text-muted-foreground" />}
          title="Your wishlist is empty"
          message="You haven't saved any events yet. Heart an event to save it here for later."
          actionLabel="Browse Events"
          onAction={() => {
            router.push("/events");
          }}
        />
      )}
    </div>
  );
}
