"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Loader2, 
  ShieldAlert,
  Ticket as TicketIcon,
  CalendarDays,
  User,
  MapPin,
  Clock,
  CreditCard,
  Building,
  Tag
} from "lucide-react";

import { adminService } from "@/services/admin.service";
import { AdminBooking } from "@/types/admin";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminBookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = Number(params.id);
  
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const bookingData = await adminService.getBookingDetail(bookingId);
        setBooking(bookingData);
      } catch (err: unknown) {
        const error = err as { message?: string };
        setError(error.message || "Failed to load booking information.");
      } finally {
        setIsLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const getStatusColor = (statusStr: string) => {
    switch (statusStr) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPaymentStatusColor = (statusStr: string | null) => {
    if (!statusStr) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    
    switch (statusStr) {
      case "SUCCESS":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
      case "CREATED":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Error Loading Booking"
          message={error || "The requested booking could not be found."}
          actionLabel="Back to Bookings"
          onAction={() => router.push("/admin/bookings")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push("/admin/bookings")}
            className="h-9 w-9"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Booking <span className="text-muted-foreground font-normal">#{booking.booking_reference}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Placed on {format(new Date(booking.created_at), "PPP 'at' p")}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Badge className={getStatusColor(booking.status)} variant="outline">
            Booking: {booking.status}
          </Badge>
          <Badge className={getPaymentStatusColor(booking.payment_status)} variant="outline">
            Payment: {booking.payment_status || "UNPAID"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Main Details (Left Col) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Event & Show Info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col md:flex-row md:justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="font-semibold">{booking.event.title}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Organizer ID</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    {booking.event.organizer}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Show Date & Time</p>
                  <p className="font-medium flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {booking.show?.start_time ? format(new Date(booking.show.start_time as string), "PPP p") : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {(booking.venue?.name as string) || "Unknown Venue"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-primary" />
                  Tickets ({booking.seats?.length || 0})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {booking.seats && booking.seats.length > 0 ? (
                <div className="divide-y">
                  {booking.seats.map((seat: { seat_row?: string; seat_number?: string | number; seat_type?: string | { name?: string }; price?: string | number }, idx: number) => (
                    <div key={idx} className="py-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {typeof seat.seat_type === 'object' ? seat.seat_type?.name : seat.seat_type || "Standard Ticket"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {seat.seat_number ? `Seat: ${seat.seat_number}` : "General Admission"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{seat.price || "0.00"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No ticket information available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info (Right Col) */}
        <div className="space-y-6">
          
          {/* Customer Info */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {booking.customer.first_name} {booking.customer.last_name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium break-all">{booking.customer.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{booking.customer.phone_number || "Not provided"}</p>
              </div>
              <div className="space-y-1 pt-2 border-t">
                <p className="text-sm text-muted-foreground">Customer ID</p>
                <p className="font-mono text-sm">{booking.customer.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tickets Total</span>
                <span>₹{booking.total_amount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Fees & Taxes</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between items-center font-bold text-lg pt-4 border-t">
                <span>Total</span>
                <span>₹{booking.total_amount}</span>
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
