import { apiClient } from "./api-client";
import { ENDPOINTS } from "@/lib/api";
import { Notification } from "@/types/notification";

interface NotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export const notificationService = {
  /**
   * Get paginated notifications for the current user
   */
  async getNotifications(page: number = 1): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>(
      `${ENDPOINTS.EVENTS.NOTIFICATIONS}?page=${page}`
    );
    return response.data;
  },
};
