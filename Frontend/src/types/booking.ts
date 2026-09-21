import { Event, Venue } from "./event";

export interface Show {
  id: number;
  event: number;
  show_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShowCreatePayload {
  event: number;
  show_date: string;
  start_time: string;
  end_time: string;
}

export interface ShowUpdatePayload extends Partial<ShowCreatePayload> {
  is_active?: boolean;
}

export interface Seat {
  id: number;
  venue: number;
  row: string;
  seat_number: string;
  seat_type: "REGULAR" | "PREMIUM" | "VIP";
  price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeatCreatePayload {
  venue: number;
  row: string;
  seat_number?: string;
  seat_type: "REGULAR" | "PREMIUM" | "VIP";
  price: string;
}

export type SeatUpdatePayload = Partial<SeatCreatePayload>;

export interface SeatBulkCreatePayload {
  venue: number;
  row: string;
  start_seat_number: number;
  end_seat_number: number;
  seat_type: "REGULAR" | "PREMIUM" | "VIP";
  price: string;
}


export interface SeatAvailability {
  id: number;
  row: string;
  seat_number: string;
  seat_type: "REGULAR" | "PREMIUM" | "VIP";
  price: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "BOOKED" | "LOCKED";
}

export interface SeatLockResponse {
  show: number;
  locked_seats: number[];
  expires_at: string;
  remaining_seconds: number;
}

export interface BookingItem {
  id: number;
  seat: Seat;
  price: string;
  created_at: string;
}

export type PaymentStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

export interface Booking {
  id: number;
  booking_reference: string;
  status: BookingStatus;
  show: Show;
  event: Event;
  venue: Venue;
  seats: BookingItem[];
  total_amount: string;
  created_at: string;
  updated_at: string;
  ticket_number?: string;
}

export interface SeatLockRequest {
  show: number;
  seats: number[];
}

export interface BookingRequest {
  show: number;
  seats: number[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
