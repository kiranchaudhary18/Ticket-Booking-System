"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { profileService } from "@/services/profile.service";
import { CustomerProfile, UserProfile } from "@/types/profile";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileContextType {
  meData: UserProfile | null;
  profileData: CustomerProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  getProfileImageUrl: () => string | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meData, setMeData] = useState<UserProfile | null>(null);
  const [profileData, setProfileData] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    // Prevent synchronous setState
    await Promise.resolve();
    
    try {
      setIsLoading(true);
      setError(null);
      const [me, profile] = await Promise.all([
        profileService.getMe(),
        profileService.getCustomerProfile(),
      ]);
      setMeData(me);
      setProfileData(profile);
    } catch (err: unknown) {
      console.error("Failed to load profile data:", err);
      setError("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => refreshProfile());
    } else {
      Promise.resolve().then(() => {
        setMeData(null);
        setProfileData(null);
        setIsLoading(false);
      });
    }
  }, [user, refreshProfile]);

  const getProfileImageUrl = () => {
    if (!profileData?.profile_picture) return null;
    return profileData.profile_picture.startsWith("http")
      ? profileData.profile_picture
      : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${profileData.profile_picture}`;
  };

  return (
    <ProfileContext.Provider value={{ meData, profileData, isLoading, error, refreshProfile, getProfileImageUrl }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
