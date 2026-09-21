import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Ticket, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

import { Booking } from "@/types/customer-dashboard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecentBookingsListProps {
  bookings: Booking[];
  isLoading?: boolean;
  error?: string | null;
}

export function RecentBookingsList({ bookings, isLoading = false, error = null }: RecentBookingsListProps) {
  if (error) {
    return (
      <Card className="border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] bg-white rounded-[1.25rem] h-full flex flex-col">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-bold text-[#0A1526]">Recent Bookings</CardTitle>
          <CardDescription className="text-sm text-slate-500">Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center text-destructive">
          <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Failed to load recent bookings.</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] bg-white rounded-[1.25rem] h-full flex flex-col">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-bold text-[#0A1526]">Recent Bookings</CardTitle>
          <CardDescription className="text-sm text-slate-500">Your latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg animate-pulse bg-muted/20">
                <div className="h-10 w-10 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none">{status}</Badge>;
      case "CANCELLED":
      case "REFUNDED":
        return <Badge variant="destructive" className="border-none">{status}</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "CANCELLED":
      case "REFUNDED":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "PENDING":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] bg-white rounded-[1.25rem] h-full flex flex-col">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl font-bold text-[#0A1526]">Recent Bookings</CardTitle>
        <CardDescription className="text-sm text-slate-500">Your latest transactions</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking: Booking) => (
              <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:shadow-sm transition-all gap-4">
                
                <div className="flex items-start space-x-4 overflow-hidden">
                  <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 mt-0.5">
                    {getStatusIcon(booking.status)}
                  </div>
                  <div className="flex flex-col overflow-hidden space-y-1">
                    <span className="text-sm font-bold text-[#0A1526] line-clamp-1" title={booking.event.title}>
                      {booking.event.title}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                      <span>{format(new Date(booking.created_at), "MMM d, yyyy")}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{booking.seats.length} {booking.seats.length === 1 ? 'seat' : 'seats'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pl-14 sm:pl-0">
                  <div className="flex flex-col items-start sm:items-end flex-shrink-0">
                    <span className="text-sm font-extrabold text-[#0A1526]">₹{booking.total_amount}</span>
                    <span className="mt-1">{getStatusBadge(booking.status)}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 rounded-full flex-shrink-0 hidden sm:flex text-slate-400 hover:text-[#0A1526] hover:bg-slate-100">
                    <Link href={`/customer/bookings/${booking.booking_reference}`}>
                      <ChevronRight className="h-5 w-5" />
                      <span className="sr-only">View Details</span>
                    </Link>
                  </Button>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <Ticket className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-base font-bold text-[#0A1526]">No recent bookings</p>
            <p className="text-sm text-slate-500 mt-1 max-w-[250px] mb-6">
              When you book tickets, your latest transactions will appear here.
            </p>
            <Button asChild className="rounded-full bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-medium h-10 px-6">
              <Link href="/events">Browse Events</Link>
            </Button>
          </div>
        )}
      </CardContent>

      {bookings.length > 0 && (
        <CardFooter className="pt-4 border-t border-slate-100 mt-auto pb-4 px-4">
          <Button variant="ghost" className="w-full text-sm font-bold text-[#3B41C5] hover:text-[#3B41C5] hover:bg-[#EEF2FF] rounded-xl h-11 transition-colors" asChild>
            <Link href="/customer/bookings">
              View All Booking History <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
