import { apiClient } from "@/services/api-client";
import { Event, EventFilterParams } from "@/types/event";
import { Show, ShowCreatePayload, ShowUpdatePayload, Seat, SeatCreatePayload, SeatBulkCreatePayload, SeatAvailability, Booking } from "@/types/booking";
import { Venue } from "@/types/event";

interface ShowsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Show[];
}

interface EventsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

export const organizerService = {
  /**
   * Fetches all events.
   * Note: The backend EventListView for ORGANIZER role returns their own events 
   * (including DRAFT/inactive) PLUS other active PUBLISHED events.
   * The frontend should filter out the events that do not belong to the current organizer ID.
   */
  getEvents: async (params?: EventFilterParams): Promise<Event[]> => {
    let allEvents: Event[] = [];
    let url = "/api/events/organizer/events/";
    
    // Initial fetch with params
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append("search", params.search);
      if (params.category) queryParams.append("category", params.category.toString());
      if (params.start_date) queryParams.append("start_date", params.start_date);
      if (params.end_date) queryParams.append("end_date", params.end_date);
      if (params.sort) queryParams.append("sort", params.sort);
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    while (url) {
      const response = await apiClient.get<any>(url);
      if (Array.isArray(response.data)) {
        allEvents = [...allEvents, ...response.data];
        break;
      } else {
        allEvents = [...allEvents, ...(response.data.results || [])];
        url = response.data.next ? new URL(response.data.next).pathname + new URL(response.data.next).search : "";
      }
    }
    
    return allEvents;
  },

  /**
   * Fetches a single event by ID.
   */
  getEvent: async (id: number): Promise<Event> => {
    const response = await apiClient.get<Event>(`/api/events/events/${id}/`);
    return response.data;
  },

  /**
   * Creates a new event.
   */
  createEvent: async (data: Partial<Event> | FormData): Promise<Event> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post<Event>(
      "/api/events/events/create/", 
      data,
      isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
    );
    return response.data;
  },

  /**
   * Updates an existing event.
   */
  updateEvent: async (id: number, data: Partial<Event> | FormData): Promise<Event> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.patch<Event>(
      `/api/events/events/${id}/update/`, 
      data,
      isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
    );
    return response.data;
  },

  /**
   * Updates the status of an event (e.g. to CANCELLED or PUBLISHED).
   */
  updateEventStatus: async (id: number, status: "DRAFT" | "PUBLISHED" | "CANCELLED"): Promise<Event> => {
    const response = await apiClient.patch<Event>(`/api/events/events/${id}/status/`, { status });
    return response.data;
  },

  /**
   * Fetches all shows for the organizer.
   * Note: The backend ShowListView automatically filters and returns 
   * ONLY the shows belonging to the organizer's own events.
   */
  getShows: async (eventId?: number): Promise<Show[]> => {
    let allShows: Show[] = [];
    let url = `/api/events/shows/${eventId ? `?event=${eventId}` : ""}`;
    
    while (url) {
      const response = await apiClient.get<any>(url);
      if (Array.isArray(response.data)) {
        allShows = [...allShows, ...response.data];
        break; // No next page if it's an array
      } else {
        allShows = [...allShows, ...(response.data.results || [])];
        url = response.data.next ? new URL(response.data.next).pathname + new URL(response.data.next).search : "";
      }
    }
    
    return allShows;
  },

  getShow: async (id: number): Promise<Show> => {
    // If there is no detail endpoint for shows, we fetch from list
    const response = await apiClient.get<ShowsResponse>(`/api/events/shows/?id=${id}`);
    if (response.data.results.length === 0) throw new Error("Show not found");
    return response.data.results[0];
  },

  createShow: async (data: ShowCreatePayload): Promise<Show> => {
    const response = await apiClient.post<Show>("/api/events/shows/create/", data);
    return response.data;
  },

  updateShow: async (id: number, data: ShowUpdatePayload): Promise<Show> => {
    const response = await apiClient.patch<Show>(`/api/events/shows/${id}/update/`, data);
    return response.data;
  },

  deleteShow: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/events/shows/${id}/delete/`);
  },

  getShowAvailableSeats: async (showId: number): Promise<SeatAvailability[]> => {
    const response = await apiClient.get<SeatAvailability[]>(`/api/events/shows/${showId}/available-seats/`);
    return response.data;
  },
  
  /**
   * Fetch specific event details
   */
  getEventDetails: async (id: number): Promise<Event> => {
    const response = await apiClient.get<Event>(`/api/events/events/${id}/`);
    return response.data;
  },

  /**
   * Fetches venues
   */
  getVenues: async (): Promise<Venue[]> => {
    let allVenues: Venue[] = [];
    let url = "/api/events/organizer/venues/";
    
    while (url) {
      const response = await apiClient.get<any>(url);
      if (Array.isArray(response.data)) {
        allVenues = [...allVenues, ...response.data];
        break;
      } else {
        allVenues = [...allVenues, ...(response.data.results || [])];
        url = response.data.next ? new URL(response.data.next).pathname + new URL(response.data.next).search : "";
      }
    }
    
    return allVenues;
  },

  createVenue: async (data: Partial<Venue>): Promise<Venue> => {
    const response = await apiClient.post<Venue>("/api/events/venues/create/", data);
    return response.data;
  },

  updateVenue: async (id: number, data: Partial<Venue>): Promise<Venue> => {
    const response = await apiClient.patch<Venue>(`/api/events/venues/${id}/update/`, data);
    return response.data;
  },

  deleteVenue: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/events/venues/${id}/delete/`);
  },

  getSeats: async (venueId?: number): Promise<Seat[]> => {
    let allSeats: Seat[] = [];
    let url = `/api/events/seats/${venueId ? `?venue=${venueId}` : ""}`;
    
    while (url) {
      const response = await apiClient.get<{ count: number; next: string | null; results: Seat[] }>(url);
      allSeats = [...allSeats, ...response.data.results];
      url = response.data.next ? new URL(response.data.next).pathname + new URL(response.data.next).search : "";
    }
    
    return allSeats;
  },

  createSeat: async (data: SeatCreatePayload): Promise<Seat> => {
    const response = await apiClient.post<Seat>("/api/events/seats/create/", data);
    return response.data;
  },

  bulkCreateSeats: async (data: SeatBulkCreatePayload): Promise<{ message: string; created_count: number }> => {
    const response = await apiClient.post<{ message: string; created_count: number }>("/api/events/seats/bulk-create/", data);
    return response.data;
  },

  getEventSeatConfigurations: async (eventId: number): Promise<any[]> => {
    const response = await apiClient.get<any[]>(`/api/events/organizer/events/${eventId}/seat-configurations/`);
    // Depending on backend pagination, it might be an array or object. Assuming ListAPIView without pagination returns an array, or checking for results
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return (response.data as any).results || [];
  },

  bulkConfigureEventSeats: async (eventId: number, data: { seat_ids: number[], seat_type: string, price: number, is_active?: boolean }): Promise<{ configured_count: number }> => {
    const response = await apiClient.post<{ configured_count: number }>(`/api/events/organizer/events/${eventId}/seat-configurations/bulk/`, data);
    return response.data;
  },

  updateSeat: async (id: number, data: Partial<SeatCreatePayload>): Promise<Seat> => {
    const response = await apiClient.patch<Seat>(`/api/events/seats/${id}/update/`, data);
    return response.data;
  },

  deleteSeat: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/events/seats/${id}/delete/`);
  },

  /**
   * Fetches recent bookings.
   * Note: This will likely fail (403) as the backend BookingListView is restricted to IsCustomer.
   * We implement this to allow the UI to handle the error state gracefully as requested.
   */
  getBookings: async (): Promise<Booking[]> => {
    const response = await apiClient.get<{ results: Booking[] }>("/api/events/bookings/");
    return response.data.results || [];
  },

  /**
   * Fetches the organizer profile.
   */
  getProfile: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get<Record<string, unknown>>("/api/accounts/organizer-profile/");
    return response.data;
  },

  /**
   * Updates the organizer profile.
   */
  updateProfile: async (data: Record<string, unknown> | FormData): Promise<Record<string, unknown>> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.put<Record<string, unknown>>(
      "/api/accounts/organizer-profile/", 
      data,
      isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : undefined
    );
    return response.data;
  },

  /**
   * Fetches the dashboard statistics
   */
  getDashboardStatistics: async (): Promise<{
    total_events: number;
    total_bookings: number;
    total_revenue: number;
    tickets_sold: number;
  }> => {
    const response = await apiClient.get("/api/events/organizer/statistics/");
    return response.data;
  },
};
