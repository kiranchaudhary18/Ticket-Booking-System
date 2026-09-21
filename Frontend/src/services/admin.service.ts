import { apiClient } from "./api-client";
import { 
  AdminDashboardStatistics, 
  AdminRevenueReport, 
  AdminTicketReport, 
  AdminEventReportResponse,
  AdminUserListResponse,
  AdminUser,
  AdminEventListResponse,
  AdminBookingListResponse,
  AdminUserFilters,
  AdminEventFilters,
  AdminBookingFilters,
  AdminBooking
} from "@/types/admin";
import { Event } from "@/types/event";
export const adminService = {
  // Statistics
  getDashboardStatistics: async (): Promise<AdminDashboardStatistics> => {
    const response = await apiClient.get<AdminDashboardStatistics>("/api/events/admin/statistics/");
    return response.data;
  },

  getRevenueReport: async (params?: { start_date?: string; end_date?: string; status?: string }): Promise<AdminRevenueReport> => {
    const response = await apiClient.get<AdminRevenueReport>("/api/events/admin/revenue/", { params });
    return response.data;
  },

  getTicketReport: async (params?: { event?: number; status?: string }): Promise<AdminTicketReport> => {
    const response = await apiClient.get<AdminTicketReport>("/api/events/admin/tickets/report/", { params });
    return response.data;
  },

  getEventReport: async (params?: { page?: number; ordering?: string }): Promise<AdminEventReportResponse> => {
    const response = await apiClient.get<AdminEventReportResponse>("/api/events/admin/events/report/", { params });
    return response.data;
  },

  // Users
  getUsers: async (params?: AdminUserFilters): Promise<AdminUserListResponse> => {
    const response = await apiClient.get<any>("/api/accounts/admin/users/", { params });
    if (Array.isArray(response.data)) {
      return { count: response.data.length, next: null, previous: null, results: response.data };
    }
    return response.data;
  },

  getUserDetail: async (id: number): Promise<AdminUser> => {
    const response = await apiClient.get<AdminUser>(`/api/accounts/admin/users/${id}/`);
    return response.data;
  },

  updateUser: async (id: number, data: Partial<AdminUser>): Promise<AdminUser> => {
    const response = await apiClient.patch<AdminUser>(`/api/accounts/admin/users/${id}/`, data);
    return response.data;
  },

  // Events
  getEvents: async (params?: AdminEventFilters): Promise<AdminEventListResponse> => {
    const response = await apiClient.get<any>("/api/events/admin/events/", { params });
    if (Array.isArray(response.data)) {
      return { count: response.data.length, next: null, previous: null, results: response.data };
    }
    return response.data;
  },

  getEventDetail: async (id: number): Promise<Event> => {
    const response = await apiClient.get<Event>(`/api/events/admin/events/${id}/`);
    return response.data;
  },

  updateEventStatus: async (id: number, data: { status?: string; is_active?: boolean }): Promise<Event> => {
    const response = await apiClient.patch<Event>(`/api/events/admin/events/${id}/`, data);
    return response.data;
  },

  // Categories (Using public category endpoints since Admin-specific doesn't exist separately)
  getCategories: async () => {
    const response = await apiClient.get("/api/events/categories/");
    return response.data;
  },
  
  createCategory: async (data: { name: string; description?: string }) => {
    const response = await apiClient.post("/api/events/categories/create/", data);
    return response.data;
  },

  updateCategory: async (id: number, data: { name?: string; description?: string; is_active?: boolean }) => {
    const response = await apiClient.patch(`/api/events/categories/${id}/update/`, data);
    return response.data;
  },

  deleteCategory: async (id: number) => {
    await apiClient.delete(`/api/events/categories/${id}/delete/`);
  },

  // Bookings
  getBookings: async (params?: AdminBookingFilters): Promise<AdminBookingListResponse> => {
    const response = await apiClient.get<any>("/api/events/admin/bookings/", { params });
    if (Array.isArray(response.data)) {
      return { count: response.data.length, next: null, previous: null, results: response.data };
    }
    return response.data;
  },

  getBookingDetail: async (id: number): Promise<AdminBooking> => {
    const response = await apiClient.get<AdminBooking>(`/api/events/admin/bookings/${id}/`);
    return response.data;
  }
};
