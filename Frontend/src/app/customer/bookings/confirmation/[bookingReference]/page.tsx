"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Booking } from "@/types/booking";
import { bookingService } from "@/services/booking.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  Loader2, 
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  CreditCard
} from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

export default function BookingConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const bookingReference = params.bookingReference as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(
        `/login?redirect=${encodeURIComponent(
          `/customer/bookings/confirmation/${bookingReference}`
        )}`
      );
      return;
    }
    
    if (authLoading || !isAuthenticated) return;
    
    const fetchBooking = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await bookingService.getBookingDetails(bookingReference);
        setBooking(data);
      } catch (err) {
        console.error("Failed to load booking:", err);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Failed to load booking details. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingReference, isAuthenticated, authLoading, router]);

  if (authLoading || isLoading) {
    return <PageSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="pt-20">
        <ErrorState 
          title="Booking Not Found"
          message={error || "We couldn't find this booking."}
          onRetry={() => window.location.reload()}
        />
        <div className="flex justify-center gap-4 mt-4 mb-20">
          <Button onClick={() => router.push("/customer/bookings")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            View My Bookings
          </Button>
          <Button onClick={() => router.push("/events")}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-US", { 
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).format(new Date(dateStr));
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-muted py-6 border-b">
        <div className="container mx-auto px-4 md:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/customer/bookings")}
            className="mb-4 text-foreground/80 hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Bookings
          </Button>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Booking Confirmation</h1>
          <p className="text-muted-foreground text-lg">Your booking has been created successfully.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-8 max-w-3xl">
        {/* Success Banner */}
        <div className="bg-success/10 border border-success/20 rounded-2xl p-6 mb-8 flex items-center gap-4">
          <div className="bg-success/15 p-3 rounded-full shrink-0">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div>
            <h2
              className={`text-xl font-bold mb-1 ${
                booking.status === "PENDING" ? "text-primary" : "text-success"
              }`}
            >
              {booking.status === "PENDING"
                ? "Booking Created — Payment Pending"
                : "Booking Confirmed!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {booking.status === "PENDING"
                ? "Complete the payment below to confirm your seats and receive your ticket."
                : "Your seats have been reserved. Please keep your booking reference for future reference."}
            </p>
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          
          {/* Booking ID & Status */}
          <div className="p-6 border-b border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Booking ID</p>
                <p className="font-mono text-lg font-bold tracking-tight">{booking.booking_reference}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge variant={STATUS_VARIANTS[booking.status] || "secondary"} className="text-sm px-3 py-1 h-auto">
                  {STATUS_LABELS[booking.status] || booking.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Event & Show Info */}
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-bold tracking-tight mb-4">{booking.event.title}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Show Date</p>
                  <p className="font-medium">{formatDate(booking.show.show_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Show Time</p>
                  <p className="font-medium">
                    {formatTime(booking.show.start_time)}
                    {booking.show.end_time ? ` - ${formatTime(booking.show.end_time)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Venue</p>
                  <p className="font-medium">
                    {booking.venue.name}
                    <span className="text-muted-foreground text-sm">
                      {" "}· {booking.venue.city}, {booking.venue.state}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Seats */}
          <div className="p-6 border-b border-border">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Selected Seats
            </h4>
            <div className="space-y-2">
              {booking.seats.map((item) => (
                <div 
                  key={item.id} 
                  className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-semibold">Seat {item.seat.row}{item.seat.seat_number}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.seat.seat_type.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">₹{item.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount */}
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-xs text-muted-foreground">
                  {booking.seats.length} {booking.seats.length === 1 ? "ticket" : "tickets"}
                </p>
              </div>
              <p className="text-3xl font-bold text-primary">₹{booking.total_amount}</p>
            </div>
          </div>
        </div>

        {/* Payment — route to the dedicated payment page while pending */}
        {booking.status === "PENDING" && (
          <div className="bg-card rounded-2xl border border-border shadow-sm mt-8 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-3 rounded-full shrink-0">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">Payment Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your payment to confirm these seats and receive
                    your ticket.
                  </p>
                </div>
              </div>
              <Button
                className="w-full sm:w-auto h-12 px-6 text-base font-medium"
                onClick={() => router.push(`/booking/${booking.id}/payment`)}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Continue to Payment
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Payments are processed securely by Razorpay. Your card details are never stored on our servers.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button 
            className="flex-1 h-12 text-lg font-medium"
            onClick={() => router.push("/customer/bookings")}
          >
            View My Bookings
          </Button>
          <Button 
            className="flex-1 h-12 text-lg font-medium"
            variant="outline"
            onClick={() => router.push("/events")}
          >
            Back to Events
          </Button>
        </div>

        {/* Payment Notice */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            {booking.status === "PENDING"
              ? "This booking stays pending until payment is completed. Unpaid seats may be released."
              : "A confirmation email with your ticket has been sent to you."}
          </p>
        </div>
      </div>
    </div>
  );
}