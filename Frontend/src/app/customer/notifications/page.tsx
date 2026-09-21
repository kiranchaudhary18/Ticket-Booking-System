"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Bell, 
  Loader2, 
  Mail, 
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

import { useNotifications } from "@/contexts/NotificationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotificationsPage() {
  const { notifications, isLoading, error, refreshNotifications, readIds, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Sent</Badge>;
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'FAILED':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CREATED':
      case 'TICKET_ISSUED':
        return <div className="p-2 bg-primary/10 rounded-full text-primary"><CheckCircle2 className="w-5 h-5" /></div>;
      case 'PAYMENT_FAILED':
      case 'BOOKING_CANCELLED':
        return <div className="p-2 bg-destructive/10 rounded-full text-destructive"><AlertCircle className="w-5 h-5" /></div>;
      default:
        return <div className="p-2 bg-muted rounded-full text-muted-foreground"><Mail className="w-5 h-5" /></div>;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          {error}
        </p>
        <Button onClick={refreshNotifications} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-12 w-12 text-muted-foreground" />}
        title="No notifications yet"
        message="You don't have any notifications at the moment. We'll let you know when there's an update on your bookings."
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Stay updated with your latest bookings and alerts.
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" onClick={markAllAsRead} className="text-primary">
              Mark all read
            </Button>
          )}
          <Button variant="outline" onClick={refreshNotifications}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => {
          const isRead = readIds.has(notification.id);
          return (
            <Card 
              key={notification.id} 
              className={`overflow-hidden transition-all hover:shadow-md border-muted/60 hover:border-border cursor-pointer ${!isRead ? 'bg-accent/5' : ''}`}
              onClick={() => {
                if (!isRead) markAsRead(notification.id);
              }}
            >
              <CardContent className="p-0">
                <div className="flex items-start p-5 sm:p-6 gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-base leading-none ${!isRead ? 'text-foreground' : 'text-foreground/80'}`}>
                          {notification.subject}
                        </h3>
                        {!isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {format(new Date(notification.created_at), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                    
                    <p className={`text-sm ${!isRead ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {getStatusBadge(notification.status)}
                      <Badge variant="outline" className="text-xs uppercase font-medium tracking-wider">
                        {notification.notification_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
