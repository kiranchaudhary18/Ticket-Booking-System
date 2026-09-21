"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { Booking } from "@/types/booking";
import { bookingService } from "@/services/booking.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  Ticket,
  CreditCard,
} from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";

const SEAT_TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  PREMIUM: "Premium",
  VIP: "VIP",
};

const BOOKING_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  REFUNDED: "outline",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));

const formatTime = (timeStr: string) => timeStr.slice(0, 5);

function LoadingScreen() {
  return <PageSkeleton />;
}

function SuccessContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const bookingId = params.bookingId as string;
  // The Razorpay payment id returned to the browser by Checkout and
  // verified by the Backend. The payment SIGNATURE is deliberately
  // never forwarded or displayed.
  const paymentId = searchParams.get("payment_id");
  const ticketNumber = searchParams.get("ticket");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Auth redirect — preserve the success URL so the user lands back
    // here after signing in.
    if (!authLoading && !isAuthenticated) {
      const currentPath = `/booking/${bookingId}/payment/success${
        paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : ""
      }`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (authLoading || !isAuthenticated) return;

    // Only CUSTOMERs use the booking/payment flow.
    if (user && user.role !== UserRole.CUSTOMER) {
      router.replace(
        user.role === UserRole.ADMIN ? "/admin/dashboard" : "/organizer/dashboard"
      );
      return;
    }

    const fetchBooking = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await bookingService.getBookingDetails(bookingId);
        setBooking(data);
      } catch (err) {
        console.error("Failed to load booking:", err);
        setLoadError(
          "We could not load this booking. It may not exist, or you may not have access to it."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, isAuthenticated, authLoading, user, router]);

  // A pending booking never reached payment success — send the user
  // back to the payment page instead of showing a misleading screen.
  useEffect(() => {
    if (booking && booking.status === "PENDING") {
      router.replace(`/booking/${booking.id}/payment`);
    }
  }, [booking, router]);

  if (authLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (loadError || !booking) {
    return (
      <div className="pt-20">
        <ErrorState
          title="Booking Not Found"
          message={loadError ?? "We could not find this booking."}
          onRetry={() => window.location.reload()}
        />
        <div className="flex justify-center gap-4 mt-4 mb-20">
          <Button onClick={() => router.push("/customer/bookings")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            View My Bookings
          </Button>
          <Button onClick={() => router.push("/events")} variant="ghost">
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === "CONFIRMED";
  const totalAmount = parseFloat(booking.total_amount).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* Success banner */}
      <div className="bg-white py-12 border-b border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl mb-5 shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A1526] mb-3">
            Payment Successful
          </h1>
          <p className="text-slate-500 text-lg max-w-md">
            Your payment has been verified and your booking is confirmed. Your
            seats are reserved for this show.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-10 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push("/customer/bookings")}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0A1526] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Bookings
          </button>
        </div>

        {/* Booking details */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-6 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">
                Event Details
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0A1526]">
                {booking.event.title}
              </h2>
            </div>
            <Badge
              variant={BOOKING_STATUS_VARIANTS[booking.status] || "secondary"}
              className="self-start shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-1 text-xs"
            >
              {BOOKING_STATUS_LABELS[booking.status] || booking.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6 text-[#3B41C5]" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                  Show Date
                </p>
                <p className="font-semibold text-[15px] text-[#0A1526]">{formatDate(booking.show.show_date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-[#3B41C5]" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                  Show Time
                </p>
                <p className="font-semibold text-[15px] text-[#0A1526]">
                  {formatTime(booking.show.start_time)} –{" "}
                  {formatTime(booking.show.end_time)}
                </p>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-[#3B41C5]" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                  Venue
                </p>
                <p className="font-semibold text-[15px] text-[#0A1526]">
                  {booking.venue.name}
                  <span className="text-slate-500 font-medium">
                    {" "}
                    · {booking.venue.city}, {booking.venue.state}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <Ticket className="h-6 w-6 text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                  Booking ID
                </p>
                <p className="font-mono font-semibold text-[13px] text-[#0A1526] break-all">
                  {booking.booking_reference}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <CreditCard className="h-6 w-6 text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                  Payment ID
                </p>
                <p className="font-mono font-semibold text-[13px] text-[#0A1526] break-all">
                  {paymentId ?? "Not available"}
                </p>
              </div>
            </div>

            <div className="sm:col-span-2 pt-6 border-t border-slate-100 mt-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-3">
                Selected Seats ({booking.seats.length})
              </p>
              <div className="flex flex-wrap gap-3">
                {booking.seats.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2"
                  >
                    <span className="font-bold text-[15px] text-[#0A1526]">
                      {item.seat.row}
                      {item.seat.seat_number}
                    </span>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {SEAT_TYPE_LABELS[item.seat.seat_type] ?? item.seat.seat_type}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-8 pt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                Amount Paid
              </p>
              <p className="text-sm font-medium text-slate-500">
                {booking.seats.length} {booking.seats.length === 1 ? "ticket" : "tickets"} + taxes
              </p>
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#3B41C5]">
              ₹{totalAmount}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          {ticketNumber && (
            <Button
              className="flex-1 h-14 rounded-xl text-[15px] font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white shadow-lg shadow-[#3B41C5]/20"
              onClick={() => router.push(`/customer/tickets/${ticketNumber}`)}
            >
              <Ticket className="mr-2 h-5 w-5" />
              View Ticket
            </Button>
          )}
          <Button
            className="flex-1 h-14 rounded-xl text-[15px] font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
            onClick={() => router.push("/customer/bookings")}
          >
            View My Bookings
          </Button>
        </div>

      </div>
    </div>
  );

}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SuccessContent />
    </Suspense>
  );
}

