"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { notificationService } from "@/services/notification.service";
import { Notification } from "@/types/notification";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationContextType {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  hasPendingNotifications: boolean;
  readIds: Set<number>;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshNotifications = async () => {
    if (!user) return;
    
    try {
      // Prevent synchronous setState in useEffect
      await Promise.resolve();
      setIsLoading(true);
      setError(null);
      const data = await notificationService.getNotifications(1);
      setNotifications(data.results || []);
    } catch (err: unknown) {
      console.error("Failed to load notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        refreshNotifications();
      });
      
      // Auto refresh every 2 minutes
      const interval = setInterval(refreshNotifications, 120000);
      return () => clearInterval(interval);
    } else {
      // Prevent synchronous setState in useEffect
      Promise.resolve().then(() => {
        setNotifications([]);
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('readNotificationIds');
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          // Prevent synchronous setState in useEffect
          Promise.resolve().then(() => setReadIds(new Set(ids)));
        } catch (e) {
          console.error("Failed to parse read notification ids", e);
        }
      }
    }
  }, []);

  const saveReadIds = (newIds: Set<number>) => {
    setReadIds(newIds);
    if (typeof window !== 'undefined') {
      localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(newIds)));
    }
  };

  const markAsRead = (id: number) => {
    saveReadIds(new Set(readIds).add(id));
  };

  const markAllAsRead = () => {
    const newIds = new Set(readIds);
    notifications.forEach(n => newIds.add(n.id));
    saveReadIds(newIds);
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  // A visual cue for the notification bell (simulating "unread" behavior using pending/recent)
  const hasPendingNotifications = unreadCount > 0;

  return (
    <NotificationContext.Provider value={{ notifications, isLoading, error, refreshNotifications, hasPendingNotifications, readIds, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
