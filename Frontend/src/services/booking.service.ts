import { apiClient } from "./api-client";
import { 
  Show, 
  SeatAvailability, 
  SeatLockResponse, 
  Booking 
} from "@/types/booking";

export interface CreateBookingResponse {
  id: number;
  show: number;
  booking_reference: string;
  status: string;
  total_amount: string;
  created_at: string;
}

export const bookingService = {
  // Shows
  getShows: async (params?: Record<string, unknown>): Promise<Show[]> => {
    const response = await apiClient.get("/api/events/shows/", { params });
    // The Backend returns a plain array (shows are not paginated). Support
    // the paginated shape too, defensively, if pagination is ever enabled.
    return response.data.results ? response.data.results : response.data;
  },

  // Seat Availability
  getAvailableSeats: async (showId: string | number): Promise<SeatAvailability[]> => {
    const response = await apiClient.get(`/api/events/shows/${showId}/available-seats/`);
    return response.data;
  },

  // Seat Locks
  lockSeats: async (showId: number, seatIds: number[]): Promise<SeatLockResponse> => {
    const response = await apiClient.post("/api/events/seat-locks/create/", {
      show: showId,
      seats: seatIds,
    });
    return response.data;
  },

  releaseSeats: async (showId: number, seatIds: number[]): Promise<{ message: string }> => {
    const response = await apiClient.post("/api/events/seat-locks/release/", {
      show: showId,
      seats: seatIds,
    });
    return response.data;
  },

  // Bookings
  createBooking: async (showId: number, seatIds: number[]): Promise<CreateBookingResponse> => {
    const response = await apiClient.post<CreateBookingResponse>("/api/events/bookings/create/", {
      show: showId,
      seats: seatIds,
    });
    return response.data;
  },

  getBookings: async (params?: Record<string, unknown>): Promise<Booking[]> => {
    const response = await apiClient.get("/api/events/bookings/", { params });
    // The Backend returns a plain array (bookings are not paginated). Support
    // the paginated shape too, defensively, if pagination is ever enabled.
    return response.data.results ? response.data.results : response.data;
  },

  getBookingDetails: async (bookingReference: string): Promise<Booking> => {
    const response = await apiClient.get(`/api/events/bookings/${bookingReference}/`);
    return response.data;
  },

  cancelBooking: async (bookingReference: string): Promise<{ status: string }> => {
    const response = await apiClient.post(`/api/events/bookings/${bookingReference}/cancel/`);
    return response.data;
  },

  getBookingStatus: async (bookingId: string | number): Promise<{ status: string; ticket_number: string | null }> => {
    const response = await apiClient.get(`/api/events/bookings/${bookingId}/status/`);
    return response.data;
  }
};
