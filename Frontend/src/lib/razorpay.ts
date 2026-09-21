/**
 * Razorpay Standard Checkout integration (frontend only).
 *
 * - Loads the official checkout script (https://checkout.razorpay.com/v1/checkout.js)
 *   on demand — this is the officially supported frontend integration
 *   (no third-party npm wrapper needed).
 * - The PUBLIC key is read from the NEXT_PUBLIC_RAZORPAY_KEY_ID environment
 *   variable (inlined at build time by Next.js).
 * - The Razorpay SECRET key lives only in the Backend and is never referenced,
 *   imported, or bundled here. All payment verification (signature check)
 *   happens server-side.
 */

/** Payload Razorpay Checkout passes to `handler` on successful payment. */
export interface RazorpayCheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** Error payload Razorpay emits on the `payment.failed` event. */
export interface RazorpayCheckoutFailure {
  error: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}


/** Options accepted by Razorpay Standard Checkout (subset we use). */
export interface RazorpayCheckoutOptions {
  /** Razorpay PUBLIC key id (e.g. rzp_test_xxxxxxxx). */
  key: string;
  /** Amount in the smallest currency unit (paise) — from the Backend order. */
  amount: number;
  /** ISO currency code, e.g. "INR". */
  currency: string;
  /** Razorpay order id created by the Backend. */
  order_id: string;
  /** Business name shown in the checkout modal. */
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  config?: any;
}

interface RazorpayInstance {
  open(): void;
  /** Register Razorpay checkout event handlers (e.g. "payment.failed"). */
  on(event: "payment.failed", handler: (response: RazorpayCheckoutFailure) => void): void;
}

type RazorpayConstructor = new (options: {
  handler: (response: RazorpayCheckoutSuccess) => void;
  modal?: {
    ondismiss?: () => void;
  };
} & RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

/**
 * Typed error raised by this integration. Lets callers distinguish
 * checkout-level issues (cancelled / failed / failed to load) from
 * Backend API errors.
 */
export class RazorpayCheckoutError extends Error {
  constructor(
    readonly kind: "unavailable" | "load-failed" | "cancelled" | "failed",
    message: string,
    /** Gateway error code (e.g. BAD_REQUEST_ERROR / CARD_DECLINED), if any. */
    readonly gatewayCode?: string,
    /** Raw gateway description — for classification/logging only, never rendered. */
    readonly gatewayDescription?: string
  ) {
    super(message);
    this.name = "RazorpayCheckoutError";
  }
}



/**
 * Resolve the Razorpay PUBLIC key:
 * 1. NEXT_PUBLIC_RAZORPAY_KEY_ID env var (primary source, kept in env vars).
 * 2. Fallback: the key_id the Backend returns with create-order
 *    (still a public key — never a secret).
 */
export function resolveRazorpayKey(fallbackKeyId?: string): string {
  const fromEnv = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "").trim();
  return fromEnv || (fallbackKeyId ?? "").trim();
}

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let checkoutScriptPromise: Promise<boolean> | null = null;

/**
 * Load the official Razorpay Checkout script once, on demand.
 * Resolves `true` when window.Razorpay is available, `false` on failure
 * (the promise is reset so a later attempt can retry).
 */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (typeof window.Razorpay === "function") {
    return Promise.resolve(true);
  }
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(typeof window.Razorpay === "function");
      script.onerror = () => {
        checkoutScriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
}

/**
 * Open Razorpay Standard Checkout and wait for the result.
 * Resolves with the handler payload (order/payment ids + signature) that the
 * Backend needs for verification; rejects with RazorpayCheckoutError if the
 * payment fails at the gateway, the modal is dismissed, or the script could
 * not be loaded.
 */
export async function openRazorpayCheckout(
  config: RazorpayCheckoutOptions
): Promise<RazorpayCheckoutSuccess> {
  const loaded = await loadRazorpay();
  const Razorpay = typeof window !== "undefined" ? window.Razorpay : undefined;
  if (!loaded || typeof Razorpay !== "function") {
    throw new RazorpayCheckoutError(
      "load-failed",
      "We couldn't load the payment gateway. Please check your internet connection and try again."
    );
  }

  return new Promise<RazorpayCheckoutSuccess>((resolve, reject) => {
    // Settle exactly once — Razorpay fires `payment.failed` and then
    // `ondismiss` when the user closes the error screen, so the first
    // event must win.
    let settled = false;

    const checkout = new Razorpay({
      ...config,
      handler: (response) => {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(
            new RazorpayCheckoutError(
              "cancelled",
              "Payment was cancelled before it could be completed. Your booking is still pending — you can try paying again."
            )
          );
        },
      },
    });

    // Gateway-declined/failed payments (card declined, bank error, etc.).
    checkout.on("payment.failed", (response) => {
      if (settled) return;
      settled = true;
      reject(
        new RazorpayCheckoutError(
          "failed",
          "Your payment could not be completed. Your booking is still pending — you can try paying again.",
          response?.error?.code,
          response?.error?.description
        )
      );
    });

    checkout.open();
  });
}
