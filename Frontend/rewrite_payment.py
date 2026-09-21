import os

content = """\"use client\";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { Booking } from "@/types/booking";
import { bookingService } from "@/services/booking.service";
import { paymentService } from "@/services/payment.service";
import { QRCodeSVG } from "qrcode.react";
import {
  openRazorpayCheckout,
  resolveRazorpayKey,
  RazorpayCheckoutError,
  RazorpayCheckoutSuccess,
} from "@/lib/razorpay";
import { CreatePaymentOrderResponse } from "@/types/payment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Loader2,
  MapPin,
  ShieldCheck,
  Ticket,
  QrCode,
  Check
} from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const SEAT_TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  PREMIUM: "Premium",
  VIP: "VIP",
};

type PayPhase = "idle" | "creating" | "checkout" | "verifying";
type PaymentMethod = "RAZORPAY" | "UPI_QR";

interface PaymentErrorInfo {
  title: string;
  message: string;
  action: "login" | "reload" | "my-bookings" | null;
  retry?: boolean;
}

function describePaymentError(error: unknown): PaymentErrorInfo {
  if (error instanceof RazorpayCheckoutError) {
    if (error.kind === "cancelled") {
      return {
        title: "Payment Cancelled",
        message:
          "Payment was cancelled before it could be completed. Your booking is still pending — you can pay whenever you are ready.",
        action: null,
        retry: true,
      };
    }
    if (error.kind === "failed") {
      const gatewayDetail = `${error.gatewayCode ?? ""} ${
        error.gatewayDescription ?? ""
      }`.toLowerCase();
      const declined =
        /declin|card|bank|issuer|insufficient|authentication|otp|netbanking|upi/.test(
          gatewayDetail
        );
      return {
        title: "Payment Failed",
        message: declined
          ? "Your bank declined the payment or it could not be processed. No amount has been deducted — if your bank placed a temporary hold, it will be released automatically. Please try again or use a different payment method."
          : "The payment could not be completed and no amount has been deducted. Your booking is still pending — please try again.",
        action: null,
        retry: true,
      };
    }
    return {
      title: "Payment Gateway Unavailable",
      message:
        "We could not load the payment gateway. Please check your internet connection and try again.",
      action: null,
      retry: true,
    };
  }

  const err = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };

  if (!err?.response) {
    return {
      title: "Connection Error",
      message:
        "We could not reach the server. Please check your internet connection and try again.",
      action: null,
      retry: true,
    };
  }

  const status = err.response.status;
  const toText = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(toText).join(" ");
    if (value && typeof value === "object") {
      return Object.values(value).map(toText).join(" ");
    }
    return value == null ? "" : String(value);
  };
  const text = toText(err.response.data).toLowerCase();

  if (status === 401) {
    return {
      title: "Session Expired",
      message: "Your session has expired. Please sign in again to complete your payment.",
      action: "login",
    };
  }
  if (status === 403) {
    return {
      title: "Access Denied",
      message: "You do not have permission to pay for this booking.",
      action: "my-bookings",
    };
  }
  if (status === 400 || status === 404 || status === 422) {
    if (/already|confirmed|not pending|cancelled/i.test(text)) {
      return {
        title: "Booking Already Processed",
        message: "This booking has already been processed and no further payment is needed.",
        action: "my-bookings",
      };
    }
    if (/signature|verify|payment_id/i.test(text)) {
      return {
        title: "Payment Verification Failed",
        message: "We could not verify your payment. If your bank account was charged, do not worry — check My Bookings, as your booking may already be confirmed.",
        action: "my-bookings",
      };
    }
    if (/razorpay|gateway|order|key/i.test(text)) {
      return {
        title: "Payment Gateway Error",
        message: "The payment gateway reported a problem while creating your order.",
        action: null,
        retry: true,
      };
    }
    return {
      title: "Payment Failed",
      message: "We could not complete your payment. Your booking remains pending — please try again.",
      action: null,
      retry: true,
    };
  }
  return {
    title: "Something Went Wrong",
    message: "We could not complete your payment. Your booking remains pending — please try again.",
    action: null,
    retry: true,
  };
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [payPhase, setPayPhase] = useState<PayPhase>("idle");
  const [paymentError, setPaymentError] = useState<PaymentErrorInfo | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const [activeOrder, setActiveOrder] = useState<CreatePaymentOrderResponse | null>(null);
  const [pendingVerification, setPendingVerification] = useState<RazorpayCheckoutSuccess | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("RAZORPAY");

  const payLockRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/booking/${bookingId}/payment`)}`);
      return;
    }
    if (authLoading || !isAuthenticated) return;
    if (user && user.role !== UserRole.CUSTOMER) {
      router.replace(user.role === UserRole.ADMIN ? "/admin/dashboard" : "/organizer/dashboard");
      return;
    }

    const fetchBooking = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await bookingService.getBookingDetails(bookingId);
        setBooking(data);
      } catch (err: unknown) {
        console.error("Failed to load booking:", err);
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr?.response?.status === 401) {
          router.push(`/login?redirect=${encodeURIComponent(`/booking/${bookingId}/payment`)}`);
          return;
        }
        if (axiosErr?.response?.status === 403) {
          setLoadError("Access Denied. You do not have permission to view this booking.");
        } else {
          setLoadError("We could not find this booking. It may not exist or has been removed.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId, isAuthenticated, authLoading, user, router]);

  // Polling effect for UPI QR
  useEffect(() => {
    if (payPhase === "checkout" && paymentMethod === "UPI_QR" && booking) {
      const poll = async () => {
        try {
          const fresh = await bookingService.getBookingStatus(booking.id);
          if (fresh.status === "CONFIRMED") {
            setPayPhase("idle");
            setActiveOrder(null);
            setTicketNumber(fresh.ticket_number ?? null);
            setBooking(prev => prev ? { ...prev, status: "CONFIRMED" } : prev);
            clearInterval(pollIntervalRef.current!);
          } else if (fresh.status === "CANCELLED" || fresh.status === "REFUNDED") {
            setPayPhase("idle");
            setActiveOrder(null);
            setBooking(prev => prev ? { ...prev, status: fresh.status } : prev);
            clearInterval(pollIntervalRef.current!);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      };

      pollIntervalRef.current = setInterval(poll, 3000);
      return () => clearInterval(pollIntervalRef.current!);
    }
  }, [payPhase, paymentMethod, booking]);

  const handleSimulatePayment = async () => {
    if (!activeOrder?.order_id) return;
    try {
      await paymentService.simulateWebhook(activeOrder.order_id);
      // Polling will catch the update shortly.
    } catch (e) {
      console.error("Simulate webhook failed", e);
    }
  };

  const handlePayNow = async () => {
    if (!booking || booking.status !== "PENDING") return;
    if (payLockRef.current || payPhase !== "idle") return;
    payLockRef.current = true;
    setPaymentError(null);

    try {
      let order = activeOrder;
      if (!order) {
        setPayPhase("creating");
        order = await paymentService.createOrder(booking.id);
        setActiveOrder(order);
      }

      if (paymentMethod === "UPI_QR") {
        setPayPhase("checkout");
        // We stay in checkout phase and wait for polling to detect payment success via webhook.
        payLockRef.current = false;
        return;
      }

      // Razorpay Checkout Flow
      const key = resolveRazorpayKey(order!.key_id);
      if (!key) {
        throw new RazorpayCheckoutError("unavailable", "Payment is not configured yet.");
      }

      setPayPhase("checkout");
      const result = await openRazorpayCheckout({
        key,
        order_id: order!.order_id,
        amount: order!.amount,
        currency: order!.currency,
        name: booking.event.title,
        description: `Booking ${booking.booking_reference}`,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#7C3AED" },
      });
      setPendingVerification(result);

      setPayPhase("verifying");
      const verification = await paymentService.verifyPayment({
        booking_id: booking.id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });

      setActiveOrder(null);
      setPendingVerification(null);
      const nextStatus = verification.booking_status || "CONFIRMED";
      setTicketNumber(verification.ticket_number ?? null);
      setBooking((prev) => (prev ? { ...prev, status: nextStatus } : prev));

    } catch (err) {
      console.error("Payment failed:", err);
      setPaymentError(describePaymentError(err));
    } finally {
      payLockRef.current = false;
      if (paymentMethod !== "UPI_QR") {
        setPayPhase("idle");
        try {
          const fresh = await bookingService.getBookingDetails(booking.booking_reference);
          setBooking(fresh);
          if (fresh.status === "CONFIRMED") {
            setPaymentError(null);
            setPendingVerification(null);
            setActiveOrder(null);
          }
        } catch (e) {}
      }
    }
  };

  const formatDate = (dateStr: string) =>
    new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(dateStr));
  const formatTime = (timeStr: string) => timeStr.slice(0, 5);

  if (authLoading || isLoading) return <PageSkeleton />;
  if (loadError || !booking) {
    return (
      <div className="pt-20">
        <ErrorState title="Booking Not Found" message={loadError ?? "We could not find this booking."} onRetry={() => window.location.reload()} />
        <div className="flex justify-center gap-4 mt-4 mb-20">
          <Button onClick={() => router.push("/customer/bookings")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> View My Bookings
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(booking.total_amount).toFixed(2);
  const isPending = booking.status === "PENDING";
  const isPaying = payPhase !== "idle";

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      <div className="bg-white py-8 border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4 md:px-6">
          <button onClick={() => router.push("/customer/bookings")} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-5">
            <ArrowLeft className="h-4 w-4" /> Back to My Bookings
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">Confirm Your Booking</h1>
            </div>
            {isPending && <Badge variant="outline" className="self-start border-amber-200 bg-amber-50 text-amber-700 px-3 py-1">Pending Payment</Badge>}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <div className="mb-6 pb-6 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Event Details</p>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{booking.event.title}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Calendar className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Show Date</p>
                    <p className="font-semibold text-slate-900">{formatDate(booking.show.show_date)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Show Time</p>
                    <p className="font-semibold text-slate-900">{formatTime(booking.show.start_time)} – {formatTime(booking.show.end_time)}</p>
                  </div>
                </div>
                <div className="sm:col-span-2 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <MapPin className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Venue</p>
                    <p className="font-semibold text-slate-900">{booking.venue.name} <span className="text-slate-500">· {booking.venue.city}, {booking.venue.state}</span></p>
                  </div>
                </div>
                <div className="sm:col-span-2 pt-6 border-t border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Selected Seats ({booking.seats.length})</p>
                  <div className="flex flex-wrap gap-3">
                    {booking.seats.map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2">
                        <span className="font-bold text-slate-900">{item.seat.row}{item.seat.seat_number}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase">{SEAT_TYPE_LABELS[item.seat.seat_type] ?? item.seat.seat_type}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {!isPending && !ticketNumber && booking.status === "CONFIRMED" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex gap-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-800">Booking Confirmed</h3>
                  <p className="text-sm text-emerald-700 mt-1">This booking has already been paid and confirmed.</p>
                </div>
              </div>
            )}

            {(booking.status === "CANCELLED" || booking.status === "REFUNDED") && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex gap-4">
                <Info className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-red-800">{booking.status === "CANCELLED" ? "Booking Cancelled" : "Booking Refunded"}</h3>
                  <p className="text-sm text-red-700 mt-1">This booking is no longer active.</p>
                </div>
              </div>
            )}

            {ticketNumber && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex gap-4">
                <Ticket className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-800">Payment Successful — Ticket Issued</h3>
                  <p className="text-sm text-emerald-700 mt-1">Ticket <span className="font-mono font-bold">{ticketNumber}</span> has been issued.</p>
                </div>
              </div>
            )}

            {!isPending && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {ticketNumber && (
                  <Button className="flex-1 h-14 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => router.push(`/customer/tickets/${ticketNumber}`)}>
                    <Ticket className="mr-2 h-5 w-5" /> View Ticket
                  </Button>
                )}
                <Button className="flex-1 h-14 rounded-xl font-bold bg-white text-slate-700 border border-slate-200" onClick={() => router.push("/customer/bookings")}>
                  View My Bookings
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-10 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Payment Summary</h3>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Tickets ({booking.seats.length})</span>
                      <span className="font-semibold text-slate-900">₹{totalAmount}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex justify-between items-end">
                      <span className="text-lg font-bold text-slate-900">Total</span>
                      <span className="text-3xl font-extrabold text-indigo-600">₹{totalAmount}</span>
                    </div>
                  </div>
                </div>

                {isPending && payPhase === "idle" && (
                  <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 mb-4">Select Payment Method</p>
                    <div className="space-y-3 mb-6">
                      <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'RAZORPAY' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === 'RAZORPAY' ? 'border-indigo-600' : 'border-slate-300'}`}>
                          {paymentMethod === 'RAZORPAY' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                        </div>
                        <CreditCard className={`h-5 w-5 ${paymentMethod === 'RAZORPAY' ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className={`font-medium ${paymentMethod === 'RAZORPAY' ? 'text-indigo-900' : 'text-slate-700'}`}>Razorpay Checkout</span>
                      </label>

                      <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'UPI_QR' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${paymentMethod === 'UPI_QR' ? 'border-indigo-600' : 'border-slate-300'}`}>
                          {paymentMethod === 'UPI_QR' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                        </div>
                        <QrCode className={`h-5 w-5 ${paymentMethod === 'UPI_QR' ? 'text-indigo-600' : 'text-slate-500'}`} />
                        <span className={`font-medium ${paymentMethod === 'UPI_QR' ? 'text-indigo-900' : 'text-slate-700'}`}>UPI QR Code</span>
                      </label>
                    </div>

                    <Button
                      className="w-full h-14 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={handlePayNow}
                      disabled={isPaying}
                    >
                      {isPaying ? (
                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                      ) : (
                        `Proceed to Pay ₹${totalAmount}`
                      )}
                    </Button>
                  </div>
                )}

                {isPending && paymentMethod === "UPI_QR" && payPhase === "checkout" && activeOrder?.upi_intent_uri && (
                  <div className="p-8 bg-white border-t border-slate-100 flex flex-col items-center text-center">
                    <h3 className="font-bold text-slate-900 mb-2">Scan & Pay</h3>
                    <p className="text-sm text-slate-500 mb-6">Use Google Pay, PhonePe, or any UPI app to scan this code.</p>
                    <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm mb-6 inline-block">
                      <QRCodeSVG value={activeOrder.upi_intent_uri} size={200} level="H" />
                    </div>
                    <div className="flex items-center gap-2 text-indigo-600 font-medium bg-indigo-50 px-4 py-2 rounded-full mb-6 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Waiting for payment...
                    </div>
                    <div className="w-full space-y-3 pt-6 border-t border-slate-100">
                      <Button variant="outline" className="w-full h-12" onClick={() => {
                        setPayPhase("idle");
                        setActiveOrder(null);
                      }}>Cancel</Button>
                      
                      {/* Temporary testing aid */}
                      {process.env.NODE_ENV === 'development' && (
                        <Button variant="secondary" className="w-full h-12 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" onClick={handleSimulatePayment}>
                          <Check className="w-4 h-4 mr-2" /> Simulate Scan (Dev Only)
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {payPhase !== "idle" && paymentMethod !== "UPI_QR" && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                  <div className="flex gap-4">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <div>
                      <p className="font-bold text-indigo-900">Processing Payment</p>
                      <p className="text-sm text-indigo-700 mt-1">Please wait while we process your payment.</p>
                    </div>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                  <div className="flex gap-4">
                    <Info className="h-6 w-6 text-red-600 shrink-0" />
                    <div>
                      <p className="font-bold text-red-800">{paymentError.title}</p>
                      <p className="text-sm text-red-700 mt-1">{paymentError.message}</p>
                      {paymentError.retry && (
                        <Button className="mt-4 bg-indigo-600 text-white" onClick={handlePayNow} disabled={payPhase !== "idle"}>Try Again</Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open("src/app/booking/[bookingId]/payment/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
