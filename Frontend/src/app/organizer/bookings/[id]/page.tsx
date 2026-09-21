"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  CreditCard,
  User,
  ShieldAlert,
  Ticket,
  Info
} from "lucide-react";

import { organizerBookingService } from "@/services/organizer-booking.service";
import { OrganizerBookingDetails } from "@/types/organizer-booking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function OrganizerBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<OrganizerBookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await organizerBookingService.getBookingDetails(bookingId);
        setBooking(data);
      } catch (err: unknown) {
        console.error("Failed to fetch booking details:", err);
        const axiosErr = err as { message?: string };
        setError(axiosErr?.message || "Failed to load booking details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "CANCELLED":
      case "REFUNDED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Error Loading Details"
          message={error || "Booking not found"}
          actionLabel="Return to Previous Page"
          onAction={() => router.back()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Booking {booking.booking_reference}
              <Badge className={getStatusColor(booking.status)} variant="outline">
                {booking.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Created on {format(new Date(booking.created_at), "PPP 'at' p")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (Event & Seats) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <h3 className="text-xl font-semibold mb-4">{booking.event.title}</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">{booking.show.show_date}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.show.start_time} - {booking.show.end_time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start sm:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Venue</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.venue.name}, {booking.venue.city}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{booking.venue.address}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Reserved Seats</CardTitle>
              <Badge variant="secondary">{booking.seats.length} Seats</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-lg rounded-bl-lg">Row</th>
                      <th className="px-4 py-3 font-medium">Seat</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium text-right rounded-tr-lg rounded-br-lg">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {booking.seats.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{item.seat.row}</td>
                        <td className="px-4 py-3">{item.seat.seat_number}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {item.seat.seat_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">${item.price}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/10 font-semibold">
                      <td colSpan={3} className="px-4 py-3 text-right">Total Amount</td>
                      <td className="px-4 py-3 text-right text-base text-primary">${booking.total_amount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 bg-muted/5">
            <CardHeader className="pb-3 border-b border-dashed">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
                <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Ticket list is restricted by backend policy.</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    The backend API explicitly omits individual tickets from the Organizer&apos;s booking response.
                    Tickets can only be viewed or verified using their explicit QR Code token during check-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Restricted Info) */}
        <div className="space-y-6">
          <Card className="bg-muted/5">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/20">
                <ShieldAlert className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                <h4 className="font-medium text-sm mb-1">Restricted by Policy</h4>
                <p className="text-xs text-muted-foreground">
                  Customer personally identifiable information (PII) is not exposed to organizers for this booking.
                </p>
                <Badge variant="outline" className="mt-4 text-muted-foreground">
                  N/A
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/5">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/20">
                <ShieldAlert className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                <h4 className="font-medium text-sm mb-1">Restricted by Policy</h4>
                <p className="text-xs text-muted-foreground">
                  Payment gateway and transaction status details are only accessible to Platform Admins.
                </p>
                <div className="flex justify-between w-full mt-6 pt-4 border-t border-dashed">
                  <span className="text-sm font-medium">Total Paid</span>
                  <span className="text-sm font-bold text-primary">${booking.total_amount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
