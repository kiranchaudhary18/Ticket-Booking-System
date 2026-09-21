"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Ticket } from "lucide-react";
import { organizerService } from "@/services/organizer.service";
import { Booking } from "@/types/organizer-dashboard";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function OrganizerRecentBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // This call will intentionally fail with 403 Forbidden 
        // because the backend endpoint requires IsCustomer or IsAdmin.
        const data = await organizerService.getBookings();
        setBookings(data);
      } catch (err: unknown) {
        console.error("Failed to fetch organizer bookings", err);
        const axiosErr = err as { response?: { status?: number } };
        // Display a clean error state acknowledging the backend limitation
        setError(axiosErr?.response?.status === 403 
          ? "You do not have permission to view global bookings. The backend API is currently restricted."
          : "Failed to load recent bookings.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchBookings();
    }
  }, [user]);

  if (isLoading) {
    return (
      <Card className="col-span-full shadow-sm">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest ticket purchases for your events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading recent bookings...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full shadow-sm border-destructive/20">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest ticket purchases for your events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center border-dashed border-2 rounded-lg m-2 border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive mb-1">Access Restricted</p>
          <p className="text-xs text-muted-foreground max-w-[400px]">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="col-span-full shadow-sm">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest ticket purchases for your events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center border-dashed border-2 rounded-lg m-2">
          <Ticket className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground mb-4">No recent bookings found.</p>
          <Button variant="outline" asChild>
            <Link href="/organizer/events">View your events</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full shadow-sm">
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>Latest ticket purchases for your events.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.slice(0, 5).map((booking) => (
            <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 last:border-0 last:pb-0 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {booking.event?.title || `Event ID: ${booking.show.event}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Booking Ref: {booking.booking_reference}
                </p>
                <p className="text-xs text-muted-foreground">
                  Customer: Unknown (Restricted)
                </p>
                <p className="text-xs text-muted-foreground">
                  Date: {new Date(booking.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="font-semibold text-sm">
                  {booking.total_amount ? `₹${booking.total_amount}` : "Free"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {booking.seats?.length || 0} Seat(s)
                </div>
                <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${
                  booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                  booking.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {booking.status}
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/organizer/bookings">View All Bookings</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
