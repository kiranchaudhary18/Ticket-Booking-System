export interface TicketEvent {
  id: number;
  title: string;
}

export interface TicketShow {
  id: number;
  date: string;
  start_time: string;
}

export interface TicketVenue {
  id: number;
  name: string;
}

export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED";

export interface TicketListItem {
  ticket_number: string;
  status: TicketStatus;
  event: TicketEvent;
  show: TicketShow;
  venue: TicketVenue;
  issued_at: string;
  used_at: string | null;
}

export interface TicketSeat {
  row: string;
  seat_number: string;
  price: string;
  seat_ticket_number?: string;
}

export interface TicketDetail extends TicketListItem {
  booking_reference: string;
  seats: TicketSeat[];
  total_amount: string;
  qr_code_image: string | null;
  qr_token?: string;
}

export interface TicketVerificationResponse {
  valid: boolean;
  message: string;
  ticket?: TicketDetail;
}
