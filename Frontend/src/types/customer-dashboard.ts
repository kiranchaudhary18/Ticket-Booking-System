import { Booking, BookingItem, BookingStatus, PaymentStatus, Show } from "./booking";
import { Event, Venue } from "./event";

// Re-exporting these so they can be accessed directly from this dashboard types file
export type { Booking, BookingItem, BookingStatus, PaymentStatus, Show, Event, Venue };

export interface CustomerDashboardStats {
  totalBookings: number;
  upcomingBookingsCount: number;
  completedBookingsCount: number;
  cancelledBookingsCount: number;
}

export interface CustomerDashboardData {
  stats: CustomerDashboardStats;
  upcomingBookings: Booking[];
  recentBookings: Booking[];
  allBookings: Booking[];
}
