import { apiClient } from "./api-client";
import { ENDPOINTS } from "@/lib/api";
import { PaginatedResponse } from "@/types/common";
import { Category, Event, EventDetail, EventFilterParams, Venue } from "@/types/event";

export const eventService = {
  /**
   * Fetch a paginated list of events based on filters
   */
  async getEvents(params?: EventFilterParams): Promise<PaginatedResponse<Event>> {
    const response = await apiClient.get<PaginatedResponse<Event>>(
      ENDPOINTS.EVENTS.LIST,
      { params }
    );
    return response.data;
  },

  /**
   * Fetch detailed information about a single event
   */
  async getEventDetail(id: string | number): Promise<EventDetail> {
    const response = await apiClient.get<EventDetail>(
      ENDPOINTS.EVENTS.DETAIL(id)
    );
    return response.data;
  },

  /**
   * Fetch the list of event categories
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<Category[]>(
      ENDPOINTS.EVENTS.CATEGORIES
    );
    return response.data;
  },

  /**
   * Fetch the list of venues
   */
  async getVenues(): Promise<Venue[]> {
    // Reusing the list pattern, assuming backend returns an array or paginated response.
    // If it's paginated, we would use PaginatedResponse<Venue>. Looking at views.py, VenueListView uses generics.ListAPIView but no pagination_class is defined explicitly on it, so it might be unpaginated or default paginated.
    // Let's assume paginated and handle both just in case, or just return .data and cast.
    const response = await apiClient.get(ENDPOINTS.EVENTS.VENUES);
    // DRF without pagination returns array. If paginated, returns { results: [] }.
    return response.data.results ? response.data.results : response.data;
  },
};
