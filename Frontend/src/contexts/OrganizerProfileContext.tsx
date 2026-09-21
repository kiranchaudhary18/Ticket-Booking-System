"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { OrganizerProfile, OrganizerProfileUpdateData } from "@/types/organizer-profile";
import { organizerService } from "@/services/organizer.service";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface OrganizerProfileContextType {
  profile: OrganizerProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: OrganizerProfileUpdateData) => Promise<void>;
  updateBasicProfile: (name: string) => Promise<void>;
}

const OrganizerProfileContext = createContext<OrganizerProfileContextType | undefined>(undefined);

export function OrganizerProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileData = useCallback(async () => {
    // Prevent synchronous setState in useEffect
    await Promise.resolve();
    
    if (!isAuthenticated || user?.role !== "ORGANIZER") {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const organizerData = await organizerService.getProfile();
      setProfile(organizerData as unknown as OrganizerProfile);
    } catch (err: unknown) {
      console.error("Failed to load organizer profile:", err);
      const axiosErr = err as { response?: { status: number, data?: { detail?: string } } };
      // Check if profile doesn't exist yet (404), which means we just need basic user info
      if (axiosErr?.response?.status !== 404) {
        setError(axiosErr?.response?.data?.detail || "Failed to load profile data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    Promise.resolve().then(() => fetchProfileData());
  }, [fetchProfileData]);

  const refreshProfile = async () => {
    await fetchProfileData();
  };

  const updateProfile = async (data: OrganizerProfileUpdateData | FormData) => {
    try {
      const updatedProfile = await organizerService.updateProfile(data as any);
      setProfile(updatedProfile as unknown as OrganizerProfile);
      toast({
        title: "Profile Updated",
        description: "Your organizer details have been saved successfully.",
      });
    } catch (err: unknown) {
      console.error("Failed to update organizer profile:", err);
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast({
        title: "Update Failed",
        description: axiosErr?.response?.data?.detail || "Failed to save profile details.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateBasicProfile = async (name: string) => {
    try {
      const updatedUser = await authService.updateCurrentUser({ name });
      
      // Update local profile state to reflect new name
      setProfile(prev => prev ? { ...prev, name: updatedUser.name } : null);
      
      toast({
        title: "Profile Updated",
        description: "Your basic information has been saved successfully.",
      });
    } catch (err: unknown) {
      console.error("Failed to update basic profile:", err);
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      toast({
        title: "Update Failed",
        description: axiosErr?.response?.data?.detail || "Failed to save basic information.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return (
    <OrganizerProfileContext.Provider
      value={{
        profile,
        isLoading,
        error,
        refreshProfile,
        updateProfile,
        updateBasicProfile,
      }}
    >
      {children}
    </OrganizerProfileContext.Provider>
  );
}

export function useOrganizerProfile() {
  const context = useContext(OrganizerProfileContext);
  if (context === undefined) {
    throw new Error("useOrganizerProfile must be used within an OrganizerProfileProvider");
  }
  return context;
}
