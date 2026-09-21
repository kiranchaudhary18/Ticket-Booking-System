/**
 * Payment module types — strictly aligned with the Backend schemas.
 *
 * Sources of truth:
 * - POST /api/events/payments/create-order/ (PaymentOrderCreateSerializer)
 * - POST /api/events/payments/verify/ (PaymentVerificationSerializer)
 * - Payment.Status / Payment.Gateway (Backend/events/models.py)
 * - TicketDetailSerializer / TicketListSerializer (issued tickets)
 */

/** Matches Payment.Gateway in Backend/events/models.py. */
export type PaymentGateway = "RAZORPAY";

/**
 * Matches Payment.Status in Backend/events/models.py.
 * (Gateway-reported statuses are normalized to SUCCESS/FAILED by the webhook.)
 */
export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED";

/** Request body of POST /api/events/payments/create-order/. */
export interface CreatePaymentOrderRequest {
  /** Primary key of the booking to pay for. */
  booking_id: number;
}

/**
 * Response of POST /api/events/payments/create-order/
 * (Backend PaymentOrderCreateSerializer.create).
 */
export interface CreatePaymentOrderResponse {
  /** Razorpay public key (never the secret). */
  key_id: string;
  /** Razorpay order id (also stored as Payment.gateway_order_id). */
  order_id: string;
  /** Amount in the smallest currency unit (paise). */
  amount: number;
  /** ISO currency code, e.g. "INR". */
  currency: string;
}

/**
 * Razorpay order data handed to the Razorpay checkout by the client.
 * Derived from CreatePaymentOrderResponse; amount stays in paise.
 */
export interface RazorpayOrderData {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  /** Merchant booking reference, echoed as the Razorpay receipt. */
  receipt: string;
}

/** Request body of POST /api/events/payments/verify/. */
export interface VerifyPaymentRequest {
  /** Primary key of the booking being paid for. */
  booking_id: number;
  /** Razorpay order id from create-order. */
  razorpay_order_id: string;
  /** Razorpay payment id returned by the checkout. */
  razorpay_payment_id: string;
  /** Razorpay payment signature returned by the checkout. */
  razorpay_signature: string;
}

/**
 * Response of POST /api/events/payments/verify/
 * (Backend PaymentVerificationSerializer.save).
 */
export interface VerifyPaymentResponse {
  detail: string;
  /** Booking status after verification ("CONFIRMED" on success). */
  booking_status: "PENDING" | "CONFIRMED" | "CANCELLED";
  /** Issued ticket number (Ticket.ticket_number). */
  ticket_number: string;
}

/**
 * Payment record shape (AdminPaymentSerializer in the Backend).
 * No customer-facing GET payment endpoint exists, so this is exposed
 * for reuse (e.g. admin screens) and documents the payment payload.
 */
export interface PaymentRecord {
  id: number;
  booking: number;
  booking_reference: string;
  customer_email: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

/** Matches Ticket.Status in Backend/events/models.py. */
export type TicketStatus = "ACTIVE" | "USED" | "CANCELLED";

/**
 * Issued ticket shape (TicketDetailSerializer in the Backend),
 * returned after a payment is verified.
 */
export interface TicketDetail {
  ticket_number: string;
  status: TicketStatus;
  booking_reference: string;
  event: { id: number; title: string };
  show: { id: number; date: string; start_time: string };
  venue: { id: number; name: string };
  seats: { row: string; seat_number: string; price: string }[];
  total_amount: string;
  issued_at: string;
  used_at: string | null;
  qr_code_image: string | null;
  qr_token?: string;
}

/**
 * Customer ticket shape (TicketListSerializer), from
 * GET /api/events/tickets/my/.
 */
export interface CustomerTicket {
  ticket_number: string;
  status: TicketStatus;
  event: { id: number; title: string };
  show: { id: number; date: string; start_time: string };
  venue: { id: number; name: string };
  issued_at: string;
  used_at: string | null;
}