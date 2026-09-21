"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlistContext } from "@/contexts/WishlistContext";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  eventId: number;
  className?: string;
  variant?: "icon" | "button";
}

export function WishlistButton({ eventId, className, variant = "icon" }: WishlistButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { checkIsWishlisted, addToWishlist, removeFromWishlist, isLoading: contextLoading } = useWishlistContext();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if we are a customer
  const isCustomer = isAuthenticated && user?.role === "CUSTOMER";
  const isOrganizerOrAdmin = isAuthenticated && user?.role !== "CUSTOMER";

  // Check state from context
  const wishlistItem = checkIsWishlisted(eventId);
  const isWishlisted = !!wishlistItem;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Not logged in -> redirect to login
    if (!isAuthenticated) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    // Explicitly prevent non-customers
    if (isOrganizerOrAdmin) {
      return;
    }

    if (!isCustomer || isProcessing || contextLoading) return;

    setIsProcessing(true);

    try {
      if (isWishlisted && wishlistItem) {
        await removeFromWishlist(wishlistItem.id);
      } else {
        await addToWishlist(eventId);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isOrganizerOrAdmin) {
    return null;
  }

  // Loading state while auth is determining status
  if (contextLoading && !isProcessing) {
    return (
      <Button 
        variant={variant === "icon" ? "ghost" : "outline"} 
        size={variant === "icon" ? "icon" : "default"}
        className={cn("opacity-50 cursor-wait", className)}
        disabled
      >
        <Heart className={cn("h-5 w-5 animate-pulse text-muted-foreground", variant === "button" && "mr-2")} />
        {variant === "button" && "Wishlist"}
      </Button>
    );
  }

  return (
    <Button
      variant={variant === "icon" ? "ghost" : (isWishlisted ? "default" : "outline")}
      size={variant === "icon" ? "icon" : "default"}
      className={cn(
        "transition-all duration-200",
        isWishlisted && variant === "icon" && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
        !isWishlisted && variant === "icon" && "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={handleToggle}
      disabled={isProcessing}
      title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart 
        className={cn(
          "h-5 w-5 transition-transform", 
          isWishlisted && "fill-current text-red-500",
          isProcessing && "animate-pulse",
          variant === "button" && "mr-2"
        )} 
      />
      {variant === "button" && (isWishlisted ? "Saved" : "Save Event")}
    </Button>
  );
}
