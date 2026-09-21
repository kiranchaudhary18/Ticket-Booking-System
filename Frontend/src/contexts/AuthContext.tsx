"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, LoginRequest, RegisterRequest } from "@/types/auth";
import { authService } from "@/services/auth.service";
import { tokenStorage } from "@/lib/token";

import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      if (tokenStorage.getAccessToken()) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        return currentUser;
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      tokenStorage.clearTokens();
      setUser(null);
    } finally {
      // Prevent synchronous setState in useEffect if no token
      await Promise.resolve();
      setIsLoading(false);
    }
    return null;
  };

  useEffect(() => {
    // defer to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      fetchCurrentUser();
    });

    const handleLogoutEvent = (event?: Event | CustomEvent<{ expired?: boolean }>) => {
      // Check if it was forced by expiration
      if (event && 'detail' in event && event.detail?.expired) {
        toast.error("Your session has expired. Please log in again.");
      }
      setUser(null);
      tokenStorage.clearTokens();
    };

    window.addEventListener("auth:logout", handleLogoutEvent as EventListener);
    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent as EventListener);
    };
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await authService.login(data);
    tokenStorage.setTokens(response.access, response.refresh);
    const loggedInUser = await fetchCurrentUser();
    if (!loggedInUser) throw new Error("Failed to fetch user after login");
    return loggedInUser;
  };

  const register = async (data: RegisterRequest) => {
    // API returns user details upon registration, but usually, we still need to login
    // However, if the API logs them in or we just want to redirect them to login:
    await authService.register(data);
    // After registration, they usually need to log in to get tokens.
    // So we don't automatically set user here unless the backend returned tokens.
  };

  const logout = async () => {
    try {
      const refresh = tokenStorage.getRefreshToken();
      if (refresh) {
        await authService.logout(refresh);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    const updatedUser = await authService.updateCurrentUser(data);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
