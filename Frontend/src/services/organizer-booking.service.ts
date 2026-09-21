import { apiClient } from "@/services/api-client";
import { Booking } from "@/types/booking";
import { 
  OrganizerBookingDetails, 
  OrganizerTicketDetails, 
  OrganizerTicketVerificationResponse, 
  OrganizerTicketCheckInResponse 
} from "@/types/organizer-booking";

export const organizerBookingService = {
  /**
   * Fetches bookings for the organizer's events.
   */
  getOrganizerBookings: async (status?: string, page: number = 1): Promise<{ results: Booking[], count: number, next: string | null, previous: string | null }> => {
    try {
      let url = `/api/events/organizer/bookings/?page=${page}`;
      if (status) {
        url += `&status=${status}`;
      }
      const response = await apiClient.get<any>(url);
      
      if (Array.isArray(response.data)) {
        return {
          results: response.data,
          count: response.data.length,
          next: null,
          previous: null
        };
      }
      return response.data;
    } catch (error) {
      console.warn("getOrganizerBookings failed - likely due to IsCustomer backend permission", error);
      throw error;
    }
  },

  /**
   * Retrieves booking details.
   * Backend uses IsBookingOwnerOrOrganizerOrAdmin, so Organizer can fetch this.
   */
  getBookingDetails: async (bookingReference: string): Promise<OrganizerBookingDetails> => {
    const response = await apiClient.get<OrganizerBookingDetails>(`/api/events/bookings/${bookingReference}/`);
    return response.data;
  },

  /**
   * Fetches ticket details.
   * Backend explicitly allows Organizer to fetch their own event's tickets.
   */
  getTicketDetails: async (ticketNumber: string): Promise<OrganizerTicketDetails> => {
    const response = await apiClient.get<OrganizerTicketDetails>(`/api/events/tickets/${ticketNumber}/`);
    return response.data;
  },

  /**
   * Verifies a ticket's QR token.
   * Backend explicitly allows Organizer to verify their own event's tickets.
   */
  verifyTicket: async (qrToken: string): Promise<OrganizerTicketVerificationResponse> => {
    const response = await apiClient.post<OrganizerTicketVerificationResponse>("/api/events/tickets/verify/", { qr_token: qrToken });
    return response.data;
  },

  /**
   * Checks in a ticket using its QR token (marks as USED).
   * Backend explicitly allows Organizer to check-in their own event's tickets.
   */
  checkInTicket: async (qrToken: string): Promise<OrganizerTicketCheckInResponse> => {
    const response = await apiClient.post<OrganizerTicketCheckInResponse>("/api/events/tickets/checkin/", { qr_token: qrToken });
    return response.data;
  }
};
