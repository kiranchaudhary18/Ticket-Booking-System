import { Event } from "./event";
// 1. Admin Dashboard Statistics
export interface AdminDashboardStatistics {
  overview: {
    users: number;
    organizers: number;
    customers: number;
    events: number;
    venues: number;
    bookings: number;
    tickets: number;
  };
  bookings: {
    pending: number;
    confirmed: number;
    cancelled: number;
  };
  payments: {
    successful: number;
    failed: number;
    pending: number;
  };
  tickets: {
    active: number;
    used: number;
    cancelled: number;
  };
  revenue: {
    total: string | number;
    monthly: Array<{ month: string; revenue: number }>;
    daily?: Array<{ date: string; revenue: number }>;
    event_wise: Array<{
      event_id: number;
      event_title: string;
      revenue: number;
      tickets_sold: number;
    }>;
  };
}

// 2. Admin Revenue Report
export interface AdminRevenueReport {
  total_revenue: number | string;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  by_event: Array<{
    event_id: number;
    event_title: string;
    revenue: number;
    tickets_sold: number;
  }>;
  by_date: Array<{
    date: string;
    revenue: number;
  }>;
  by_month: Array<{
    month: string;
    revenue: number;
  }>;
}

// 3. Admin Ticket Report
export interface AdminTicketReport {
  total_tickets: number;
  active_tickets: number;
  used_tickets: number;
  cancelled_tickets: number;
  by_event: Array<{
    event_id: number;
    event_title: string;
    total: number;
    active: number;
    used: number;
    cancelled: number;
  }>;
}

// 4. Admin Event Report
export interface AdminEventReport {
  id: number;
  title: string;
  organizer_name: string;
  total_shows: number;
  total_bookings: number;
  total_tickets: number;
  total_revenue: number;
  status: string;
}

export interface AdminEventReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminEventReport[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AdminUserListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminUser[];
}

export interface AdminEventListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

export interface AdminBooking {
  id: number;
  booking_reference: string;
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  event: Event;
  show: Record<string, unknown>;
  venue: Record<string, unknown>;
  seats: Record<string, unknown>[];
  total_amount: string;
  status: string;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBookingListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminBooking[];
}

export interface AdminBookingFilters {
  search?: string;
  status?: string;
  event?: number;
  customer?: number;
  date?: string;
  ordering?: string;
  page?: number;
}

// Filter Types
export interface AdminUserFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  ordering?: string;
  page?: number;
}

export interface AdminEventFilters {
  search?: string;
  status?: string;
  is_active?: boolean;
  ordering?: string;
  page?: number;
}

export interface AdminBookingFilters {
  search?: string;
  status?: string;
  event?: number;
  customer?: number;
  date?: string;
  ordering?: string;
  page?: number;
}
