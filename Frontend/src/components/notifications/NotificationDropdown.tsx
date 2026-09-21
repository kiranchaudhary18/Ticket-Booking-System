"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Bell, Loader2, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { useNotifications } from "@/contexts/NotificationContext";

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, isLoading, hasPendingNotifications, readIds, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const recentNotifications = notifications.slice(0, 5); // Show only top 5 in dropdown

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CREATED':
      case 'TICKET_ISSUED':
        return <CheckCircle2 className="w-4 h-4 text-primary" />;
      case 'PAYMENT_FAILED':
      case 'BOOKING_CANCELLED':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Mail className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger className="relative h-10 w-10 flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-accent hover:text-accent-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <Bell className="h-5 w-5 text-foreground" />
        {hasPendingNotifications && (
          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-accent border-2 border-background" />
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between font-normal">
          <span className="font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                className="text-xs text-primary hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
            <Badge variant="secondary" className="text-xs">
              {unreadCount} Unread
            </Badge>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {isLoading && notifications.length === 0 ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            recentNotifications.map((notif) => {
              const isRead = readIds.has(notif.id);
              return (
                <DropdownMenuItem 
                  key={notif.id} 
                  className={`flex items-start gap-3 p-3 cursor-pointer ${!isRead ? 'bg-accent/30' : ''}`}
                  onClick={() => {
                    markAsRead(notif.id);
                    setIsOpen(false);
                    router.push("/customer/notifications");
                  }}
                >
                <div className="mt-0.5">
                  {getNotificationIcon(notif.notification_type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none line-clamp-1">{notif.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(notif.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0">
              <Button 
                variant="ghost" 
                className="w-full rounded-none justify-center font-semibold text-primary hover:text-primary/80"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/customer/notifications");
                }}
              >
                View all notifications
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
