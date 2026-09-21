import { Event, Venue } from "./event";
import { Show, BookingStatus, Seat } from "./booking";

// For TicketDetailSerializer
export interface OrganizerTicketEvent {
  id: number;
  title: string;
}

export interface OrganizerTicketShow {
  id: number;
  date: string;
  start_time: string;
}

export interface OrganizerTicketVenue {
  id: number;
  name: string;
}

export interface OrganizerTicketSeat {
  row: string;
  seat_number: string;
  price: string;
}

export interface OrganizerTicketDetails {
  ticket_number: string;
  status: string;
  booking_reference: string;
  event: OrganizerTicketEvent;
  show: OrganizerTicketShow;
  venue: OrganizerTicketVenue;
  seats: OrganizerTicketSeat[];
  total_amount: string;
  issued_at: string;
  used_at: string | null;
  qr_code_image: string | null;
}

export interface OrganizerTicketVerificationResponse {
  status: "VALID" | "CHECKED_IN" | "WRONG_DATE" | "CANCELLED" | "PAYMENT_PENDING" | "INVALID" | "UNAUTHORIZED" | "ALREADY_CHECKED_IN";
  detail?: string;
  ticket?: OrganizerTicketDetails;
}

export interface OrganizerTicketCheckInResponse {
  status: "CHECKED_IN" | "WRONG_DATE" | "CANCELLED" | "PAYMENT_PENDING" | "INVALID" | "UNAUTHORIZED" | "ALREADY_CHECKED_IN";
  detail: string;
  ticket?: OrganizerTicketDetails;
}

// For BookingListSerializer (used in BookingDetailView for Organizer)
export interface OrganizerBookingItem {
  id: number;
  seat: Seat;
  price: string;
  created_at: string;
}

export interface OrganizerBookingDetails {
  id: number;
  booking_reference: string;
  status: BookingStatus;
  show: Show;
  event: Event;
  venue: Venue;
  seats: OrganizerBookingItem[];
  total_amount: string;
  created_at: string;
  updated_at: string;
  // NOTE: Customer information and payment_status are NOT included here 
  // because the Backend BookingListSerializer does not expose them.
}
