import { bookingService } from "./booking.service";
import { Booking } from "@/types/booking";

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

export const customerDashboardService = {
  /**
   * Fetches all customer bookings and calculates dashboard statistics locally
   * since there is no dedicated backend endpoint for customer dashboard stats.
   */
  getDashboardData: async (): Promise<CustomerDashboardData> => {
    // Use the existing getBookings API which returns the authenticated user's bookings
    const bookings = await bookingService.getBookings();

    const now = new Date();

    const totalBookings = bookings.length;
    let upcomingBookingsCount = 0;
    let completedBookingsCount = 0;
    let cancelledBookingsCount = 0;

    const upcomingBookings: Booking[] = [];
    
    // Sort all bookings by created_at descending (most recent first)
    const sortedBookings = [...bookings].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    for (const booking of sortedBookings) {
      if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
        cancelledBookingsCount++;
        continue; // Cancelled bookings are not upcoming
      }

      // Check if show is in the future
      const showDateTime = new Date(`${booking.show.show_date}T${booking.show.start_time}`);
      
      if (showDateTime > now && (booking.status === "CONFIRMED" || booking.status === "PENDING")) {
        upcomingBookingsCount++;
        upcomingBookings.push(booking);
      } else if (showDateTime <= now && booking.status === "CONFIRMED") {
        completedBookingsCount++;
      }
    }

    // Sort upcoming by show date ascending (soonest first)
    upcomingBookings.sort((a, b) => {
      const dateA = new Date(`${a.show.show_date}T${a.show.start_time}`).getTime();
      const dateB = new Date(`${b.show.show_date}T${b.show.start_time}`).getTime();
      return dateA - dateB;
    });

    // Recent bookings are simply the most recently created (top 5)
    const recentBookings = sortedBookings.slice(0, 5);

    return {
      stats: {
        totalBookings,
        upcomingBookingsCount,
        completedBookingsCount,
        cancelledBookingsCount,
      },
      upcomingBookings,
      recentBookings,
      allBookings: sortedBookings,
    };
  }
};
