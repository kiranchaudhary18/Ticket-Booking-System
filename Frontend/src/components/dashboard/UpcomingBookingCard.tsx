import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, ChevronRight, Ticket as TicketIcon } from "lucide-react";

import { Booking } from "@/types/customer-dashboard";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpcomingBookingCardProps {
  booking: Booking | null;
}

export function UpcomingBookingCard({ booking }: UpcomingBookingCardProps) {
  if (!booking) {
    return (
      <Card className="border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] bg-white rounded-[1.25rem] h-full flex flex-col">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl font-bold text-[#0A1526]">Next Upcoming Event</CardTitle>
          <CardDescription className="text-sm text-slate-500">Your next scheduled experience</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-bold text-[#0A1526]">No upcoming events</p>
          <p className="text-sm text-slate-500 mt-1 max-w-[250px]">
            You don&apos;t have any upcoming bookings at the moment. Ready for your next experience?
          </p>
          <Button asChild className="mt-6 rounded-full bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-medium h-10 px-6">
            <Link href="/events">Browse Events</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Safe fallback if image is not absolute URL
  const imageUrl = booking.event.event_image 
    ? booking.event.event_image.startsWith("http") 
      ? booking.event.event_image 
      : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${booking.event.event_image}`
    : null;

  return (
    <Card className="border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] bg-white rounded-[1.25rem] overflow-hidden flex flex-col h-full">
      {imageUrl ? (
        <div className="relative w-full h-48 bg-slate-100">
          <Image 
            src={imageUrl} 
            alt={booking.event.title} 
            fill 
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1526]/90 via-[#0A1526]/40 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 text-white">
            <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-2.5 py-0.5 rounded-md text-xs font-semibold">
              {booking.status}
            </Badge>
            <h3 className="text-2xl font-bold line-clamp-1">{booking.event.title}</h3>
          </div>
        </div>
      ) : (
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{booking.event.title}</CardTitle>
              <CardDescription>Your next scheduled experience</CardDescription>
            </div>
            <Badge variant={booking.status === "CONFIRMED" ? "default" : "secondary"}>
              {booking.status}
            </Badge>
          </div>
        </CardHeader>
      )}

      <CardContent className={`flex-1 flex flex-col space-y-5 px-5 ${imageUrl ? 'pt-5' : 'pt-5'}`}>
        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center"><Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Date</span>
            <p className="text-sm font-bold text-[#0A1526]">{format(new Date(booking.show.show_date), "MMM d, yyyy")}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Time</span>
            <p className="text-sm font-bold text-[#0A1526]">{booking.show.start_time.substring(0, 5)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Venue</span>
            <p className="text-sm font-bold text-[#0A1526] line-clamp-1" title={`${booking.venue.name}, ${booking.venue.city}`}>
              {booking.venue.name}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 flex items-center"><TicketIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> Seats</span>
            <p className="text-sm font-bold text-[#0A1526]">
              {booking.seats.length} {booking.seats.length === 1 ? 'ticket' : 'tickets'}
            </p>
          </div>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500">Reference No.</span>
          <span className="text-sm font-mono font-bold text-[#0A1526] bg-slate-50 px-2 py-0.5 rounded-md">{booking.booking_reference}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-5 px-5">
        <Button className="w-full h-11 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#3B41C5] font-semibold rounded-xl" asChild>
          <Link href={`/customer/bookings/${booking.booking_reference}`}>
            View Booking Details <ChevronRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
