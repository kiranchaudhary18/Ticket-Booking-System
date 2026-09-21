import { apiClient } from "./api-client";
import { TicketListItem, TicketDetail, TicketVerificationResponse } from "@/types/ticket";

export const ticketService = {
  /**
   * Get all tickets for the logged-in customer.
   * GET /api/events/tickets/my/
   */
  getMyTickets: async (): Promise<TicketListItem[]> => {
    const response = await apiClient.get<TicketListItem[] | { results: TicketListItem[] }>("/api/events/tickets/my/");
    const data = response.data;
    return (data as { results?: TicketListItem[] }).results || (data as TicketListItem[]);
  },

  /**
   * Get ticket details by ticket number.
   * GET /api/events/tickets/<ticket_number>/
   */
  getTicketDetails: async (ticketNumber: string): Promise<TicketDetail> => {
    const response = await apiClient.get<TicketDetail>(`/api/events/tickets/${ticketNumber}/`);
    return response.data;
  },

  /**
   * Verify a ticket (used by organizers/scanners).
   * POST /api/events/tickets/verify/
   */
  verifyTicket: async (ticketNumber: string): Promise<TicketVerificationResponse> => {
    const response = await apiClient.post<TicketVerificationResponse>("/api/events/tickets/verify/", {
      ticket_number: ticketNumber,
    });
    return response.data;
  },

  /**
   * Check-in a ticket (used by organizers/scanners).
   * POST /api/events/tickets/checkin/
   */
  checkInTicket: async (ticketNumber: string): Promise<TicketVerificationResponse> => {
    const response = await apiClient.post<TicketVerificationResponse>("/api/events/tickets/checkin/", {
      ticket_number: ticketNumber,
    });
    return response.data;
  },
};
