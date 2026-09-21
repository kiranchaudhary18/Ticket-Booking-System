import Link from "next/link";
import { format } from "date-fns";
import { Ticket, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Booking } from "@/types/customer-dashboard";
import { Button } from "@/components/ui/button";

interface CompactBookingBannerProps {
  booking: Booking | null;
}

export function CompactBookingBanner({ booking }: CompactBookingBannerProps) {
  if (!booking) return null;

  // Prefer the specific show date, fallback to event start date
  const dateString = booking.show?.show_date || booking.event?.start_date;
  
  // Safely parse the date. If invalid, date-fns format() will throw an error, 
  // so we must handle that gracefully to avoid crashing the whole page.
  let formattedDate = "Date TBD";
  if (dateString) {
    const eventDate = new Date(dateString);
    if (!Number.isNaN(eventDate.getTime())) {
      formattedDate = format(eventDate, "MMM d, yyyy");
    }
  }
  
  return (
    <div className="w-full bg-[#0A1526] rounded-2xl p-4 md:p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-slate-200/50 relative overflow-hidden">
      {/* Decorative accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#3B41C5]/20 blur-2xl rounded-full -mt-10 -mr-10 pointer-events-none" />
      
      <div className="flex items-start sm:items-center gap-4 relative z-10">
        <div className="hidden sm:flex h-12 w-12 rounded-full bg-[#1A2639] items-center justify-center flex-shrink-0">
          <Ticket className="h-6 w-6 text-[#c29665]" />
        </div>
        
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#c29665] mb-1">
            Your Next Experience
          </p>
          <h3 className="text-lg md:text-xl font-bold text-white mb-1 line-clamp-1">
            {booking.event?.title || "Upcoming Event"}
          </h3>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="flex items-center gap-1.5 line-clamp-1">
              <MapPin className="h-4 w-4" />
              {booking.venue?.name || "Venue TBD"}
            </span>
          </div>
        </div>
      </div>

      <Button 
        asChild
        variant="ghost" 
        className="relative z-10 w-full sm:w-auto flex-shrink-0 bg-white/10 hover:bg-white/20 text-white border-0 font-medium h-11 px-5 rounded-xl transition-colors"
      >
        <Link href={`/customer/bookings/${booking.booking_reference}`}>
          View Ticket <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
