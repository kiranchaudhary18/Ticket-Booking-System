import { apiClient } from "./api-client";
import { ENDPOINTS } from "@/lib/api";
import {
  CustomerProfile,
  OrganizerProfile,
  UpdateCustomerProfileRequest,
  UpdateOrganizerProfileRequest,
  UserProfile,
  UpdateUserProfileRequest,
} from "@/types/profile";

export const profileService = {
  /**
   * Get the current authenticated user's base profile (name, email, role)
   */
  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(ENDPOINTS.AUTH.ME);
    return response.data;
  },

  /**
   * Update the current authenticated user's base profile (name)
   */
  async updateMe(data: UpdateUserProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>(ENDPOINTS.AUTH.ME, data);
    return response.data;
  },

  /**
   * Get the current CUSTOMER's extended profile
   */
  async getCustomerProfile(): Promise<CustomerProfile> {
    const response = await apiClient.get<CustomerProfile>(
      ENDPOINTS.AUTH.CUSTOMER_PROFILE
    );
    return response.data;
  },

  /**
   * Update the current CUSTOMER's extended profile
   * Accepts JSON or FormData (for profile picture uploads)
   */
  async updateCustomerProfile(
    data: UpdateCustomerProfileRequest | FormData
  ): Promise<CustomerProfile> {
    // If it's FormData, axios automatically sets the correct Content-Type (multipart/form-data)
    const isFormData = data instanceof FormData;
    
    const response = await apiClient.put<CustomerProfile>(
      ENDPOINTS.AUTH.CUSTOMER_PROFILE,
      data,
      isFormData
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined
    );
    return response.data;
  },

  /**
   * Get the current ORGANIZER's extended profile
   */
  async getOrganizerProfile(): Promise<OrganizerProfile> {
    const response = await apiClient.get<OrganizerProfile>(
      ENDPOINTS.AUTH.ORGANIZER_PROFILE
    );
    return response.data;
  },

  /**
   * Update the current ORGANIZER's extended profile
   * Accepts JSON or FormData (for profile picture uploads)
   */
  async updateOrganizerProfile(
    data: UpdateOrganizerProfileRequest | FormData
  ): Promise<OrganizerProfile> {
    const isFormData = data instanceof FormData;

    const response = await apiClient.put<OrganizerProfile>(
      ENDPOINTS.AUTH.ORGANIZER_PROFILE,
      data,
      isFormData
        ? {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        : undefined
    );
    return response.data;
  },
};
