/**
 * Professional, user-facing error handling for the booking flow.
 *
 * Server (DRF) error bodies are parsed ONLY to classify the failure.
 * The raw Django/server text is never surfaced to the user — every
 * scenario renders a friendly message plus a recovery action instead.
 */

export type BookingPhase = "load" | "lock" | "booking";

export type BookingErrorKind =
  | "SEAT_UNAVAILABLE"
  | "SEAT_LOCK_FAILED"
  | "SEAT_LOCK_EXPIRED"
  | "BOOKING_FAILED"
  | "INVALID_SHOW"
  | "EVENT_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "PERMISSION_DENIED"
  | "AUTH_EXPIRED"
  | "VALIDATION_ERROR"
  | "UNKNOWN";

export type BookingRecoveryAction =
  | "refresh-seats"
  | "retry"
  | "back-to-events"
  | "login"
  | "reload";

export interface BookingErrorInfo {
  kind: BookingErrorKind;
  phase: BookingPhase;
  title: string;
  message: string;
  /** Label shown on the recovery button. */
  recovery: string;
  /** What the recovery button should do. */
  action: BookingRecoveryAction;
}

interface ErrorDetail {
  title: string;
  message: string;
  recovery: string;
  action: BookingRecoveryAction;
}

// Friendly copy per failure kind. No server text appears here.
const ERROR_DETAILS: Record<BookingErrorKind, ErrorDetail> = {
  SEAT_UNAVAILABLE: {
    title: "Seats Unavailable",
    message:
      "One or more of the seats you selected were just taken. Please choose different seats.",
    recovery: "Choose Different Seats",
    action: "refresh-seats",
  },
  SEAT_LOCK_FAILED: {
    title: "Couldn't Reserve Seats",
    message:
      "We were unable to reserve your seats. Please try again or pick different seats.",
    recovery: "Pick Seats Again",
    action: "refresh-seats",
  },
  SEAT_LOCK_EXPIRED: {
    title: "Reservation Expired",
    message:
      "Your seat reservation has expired, so we couldn't complete the booking. Please select your seats again.",
    recovery: "Select Seats Again",
    action: "refresh-seats",
  },
  BOOKING_FAILED: {
    title: "Booking Failed",
    message:
      "We couldn't complete your booking. Nothing was charged and no seats were held. Please try again.",
    recovery: "Try Again",
    action: "retry",
  },
  INVALID_SHOW: {
    title: "Show Unavailable",
    message:
      "This show is no longer available. It may have been cancelled or removed.",
    recovery: "Browse Events",
    action: "back-to-events",
  },
  EVENT_UNAVAILABLE: {
    title: "Event Unavailable",
    message:
      "This event is no longer accepting bookings. Please check other events.",
    recovery: "Browse Events",
    action: "back-to-events",
  },
  NETWORK_ERROR: {
    title: "Connection Error",
    message:
      "We couldn't reach the server. Please check your internet connection and try again.",
    recovery: "Try Again",
    action: "retry",
  },
  PERMISSION_DENIED: {
    title: "Access Denied",
    message: "You don't have permission to complete this booking.",
    recovery: "Back to Events",
    action: "back-to-events",
  },
  AUTH_EXPIRED: {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again to continue.",
    recovery: "Sign In",
    action: "login",
  },
  VALIDATION_ERROR: {
    title: "Invalid Selection",
    message:
      "Your seat selection couldn't be processed as requested. Please review and choose again.",
    recovery: "Review Seats",
    action: "refresh-seats",
  },
  UNKNOWN: {
    title: "Something Went Wrong",
    message: "Something unexpected happened. Please try again.",
    recovery: "Try Again",
    action: "reload",
  },
};

function buildInfo(kind: BookingErrorKind, phase: BookingPhase): BookingErrorInfo {
  const detail = ERROR_DETAILS[kind];
  return {
    kind,
    phase,
    title: detail.title,
    message: detail.message,
    recovery: detail.recovery,
    action: detail.action,
  };
}

function lookup(kind: BookingErrorKind, phase: BookingPhase): BookingErrorInfo {
  return buildInfo(kind, phase);
}

/**
 * Flatten a DRF error body into a plain text blob.
 * Used strictly for keyword classification — never for display.
 */
function toServiceText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(toServiceText).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value).map(toServiceText).join(" ");
  }
  return value == null ? "" : String(value);
}

/**
 * Classify any error thrown by the booking API calls into a
 * user-friendly BookingErrorInfo.
 *
 * - `err.response` present          -> server answered (4xx/5xx)
 * - `err.response` absent           -> network failure or a local error
 */
export function classifyBookingError(
  error: unknown,
  phase: BookingPhase
): BookingErrorInfo {
  const err = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };

  const hasResponse = Boolean(err?.response);
  const status = err?.response?.status;
  const messageText = String(err?.message ?? "");
  // Service text is used for classification only.
  const serviceText = hasResponse
    ? toServiceText(err.response?.data)
    : messageText;

  // Local errors thrown by our own load code (e.g., "Show not found or unavailable.")
  if (!hasResponse && phase === "load") {
    if (/(not found|not available|no longer|does not exist)/i.test(messageText)) {
      return lookup("INVALID_SHOW", phase);
    }
    return lookup("NETWORK_ERROR", phase);
  }

  if (!hasResponse) {
    return lookup("NETWORK_ERROR", phase);
  }

  if (status === 401) {
    return lookup("AUTH_EXPIRED", phase);
  }

  if (status === 403) {
    return lookup("PERMISSION_DENIED", phase);
  }

  if (status === 404) {
    return lookup("INVALID_SHOW", phase);
  }

  if (status === 400 || status === 422) {
    const text = serviceText.toLowerCase();

    // Seat already taken (booked or locked by someone else).
    if (
      /(locked by another|locked by other|currently locked)/i.test(text) ||
      /(already booked|booked|no longer available|unavailable|already taken|taken)/i.test(text)
    ) {
      return lookup("SEAT_UNAVAILABLE", phase);
    }

    // Reservation lock missing/expired.
    if (/(active locks|lock.*(expired|invalid)|expired|reservation)/i.test(text)) {
      return lookup(
        phase === "booking" ? "SEAT_LOCK_EXPIRED" : "SEAT_LOCK_FAILED",
        phase
      );
    }

    // Show-level problems.
    if (/(invalid pk|does not exist|not found|show.*not active|show.*inactive)/i.test(text)) {
      return lookup("INVALID_SHOW", phase);
    }

    // A specific seat is not active.
    if (/(seat.*not active|not active.*seat)/i.test(text)) {
      return lookup("SEAT_UNAVAILABLE", phase);
    }

    // Event / venue no longer bookable.
    if (/(event.*(not active|not published|inactive)|not published|venue.*(not active|inactive))/i.test(text)) {
      return lookup("EVENT_UNAVAILABLE", phase);
    }

    // Generic validation.
    if (/(duplicate|at least one|required)/i.test(text)) {
      return lookup("VALIDATION_ERROR", phase);
    }

    // Unrecognised 400 — fall back to a phase-specific friendly error.
    if (phase === "lock") return lookup("SEAT_LOCK_FAILED", phase);
    if (phase === "booking") return lookup("BOOKING_FAILED", phase);
    return lookup("UNKNOWN", phase);
  }

  // Any other server error (5xx etc.) — phase-specific fallback.
  if (phase === "lock") return lookup("SEAT_LOCK_FAILED", phase);
  if (phase === "booking") return lookup("BOOKING_FAILED", phase);
  return lookup("UNKNOWN", phase);
}