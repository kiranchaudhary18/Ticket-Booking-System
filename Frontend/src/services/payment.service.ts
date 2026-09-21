import { apiClient } from "./api-client";
import type {
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponse,
  CustomerTicket,
  TicketDetail,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
} from "@/types/payment";

export const paymentService = {
  /**
   * Create a Razorpay order for a booking.
   * POST /api/events/payments/create-order/ with { booking_id }.
   * Requires an authenticated CUSTOMER who owns the booking.
   */
  createOrder: async (
    bookingId: number
  ): Promise<CreatePaymentOrderResponse> => {
    const response = await apiClient.post<CreatePaymentOrderResponse>(
      "/api/events/payments/create-order/",
      { booking_id: bookingId } satisfies CreatePaymentOrderRequest
    );
    return response.data;
  },

  /**
   * Verify a Razorpay payment for a booking.
   * POST /api/events/payments/verify/ with
   * { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }.
   * On success the Backend marks the payment SUCCESS, confirms the booking,
   * and issues a ticket.
   */
  verifyPayment: async (
    payload: VerifyPaymentRequest
  ): Promise<VerifyPaymentResponse> => {
    const response = await apiClient.post<VerifyPaymentResponse>(
      "/api/events/payments/verify/",
      payload
    );
    return response.data;
  },

  /**
   * Get the issued ticket for a booking.
   * GET /api/events/tickets/<ticket_number>/ (TicketDetailView).
   * Use the ticket_number returned by verifyPayment.
   */
  getTicket: async (ticketNumber: string): Promise<TicketDetail> => {
    const response = await apiClient.get<TicketDetail>(
      `/api/events/tickets/${ticketNumber}/`
    );
    return response.data;
  },

  /**
   * List tickets belonging to the logged-in customer.
   * GET /api/events/tickets/my/ (CustomerTicketListView, CUSTOMER only).
   */
  getMyTickets: async (params?: {
    status?: "ACTIVE" | "USED" | "CANCELLED";
  }): Promise<CustomerTicket[]> => {
    const response = await apiClient.get("/api/events/tickets/my/", { params });
    // The Backend returns a plain array (tickets are not paginated). Support
    // the paginated shape too, defensively, if pagination is ever enabled.
    return response.data.results ? response.data.results : response.data;
  },

  /**
   * Mock endpoint to simulate Razorpay webhook in test environment.
   */
  simulateWebhook: async (razorpayOrderId: string): Promise<{ detail: string }> => {
    const response = await apiClient.post("/api/events/payments/mock-webhook/", {
      razorpay_order_id: razorpayOrderId,
    });
    return response.data;
  }
};