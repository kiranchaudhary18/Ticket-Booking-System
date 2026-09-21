import { Event as CoreEvent, Venue } from "./event";
import { Show as CoreShow, Booking, BookingItem, BookingStatus, PaymentStatus } from "./booking";

// Re-exporting core models that align directly with Backend endpoints
export interface Event extends CoreEvent {
  image?: string;
  venue_name?: string;
  capacity?: number;
}

export interface Show extends CoreShow {
  event_title?: string;
  available_seats?: number;
}

export type { Venue, Booking, BookingItem, BookingStatus, PaymentStatus };

/**
 * Note: The Backend does NOT provide a Statistics endpoint for Organizers 
 * (only AdminDashboardStatisticsView exists). 
 * These statistics must be calculated on the frontend using the 
 * /api/events/events/ and /api/events/shows/ endpoints.
 */
export interface OrganizerDashboardStats {
  totalEvents: number;
  activeShowsCount: number;
  
  // These fields are placeholders. Since there is no Organizer bookings API, 
  // tickets sold and total revenue cannot be fetched directly from the backend
  // without guessing or modifying the backend. They will default to 0.
  ticketsSold: number;
  totalRevenue: number;
}

export interface OrganizerDashboardData {
  stats: OrganizerDashboardStats;
  events: Event[];
  shows: Show[];
}
