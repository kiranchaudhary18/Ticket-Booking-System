import React from "react";
import { EventDetail } from "@/types/event";
import { Show, SeatAvailability } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Info, Loader2, Lock, Ticket, MapPin, Calendar, Clock } from "lucide-react";

interface BookingSummaryProps {
  event: EventDetail;
  show: Show;
  selectedSeats: SeatAvailability[];
  isLocked: boolean;
  countdown: number | null;
  isBooking: boolean;
  onLockSeats: () => void;
  onConfirmBooking: () => void;
}

const SEAT_TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  PREMIUM: "Premium",
  VIP: "VIP",
};

export function BookingSummary({
  event,
  show,
  selectedSeats,
  isLocked,
  countdown,
  isBooking,
  onLockSeats,
  onConfirmBooking
}: BookingSummaryProps) {
  
  const totalAmount = selectedSeats.reduce((sum, seat) => sum + parseFloat(seat.price), 0);
  
  // Group seats by type for a clean summary
  const seatsByType = React.useMemo(() => {
    const groups = new Map<string, { count: number; price: number }>();
    selectedSeats.forEach(seat => {
      const existing = groups.get(seat.seat_type);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(seat.seat_type, { count: 1, price: parseFloat(seat.price) });
      }
    });
    return Array.from(groups.entries());
  }, [selectedSeats]);
  
  const showDate = new Date(show.show_date);
  const formattedShowDate = new Intl.DateTimeFormat("en-US", { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  }).format(showDate);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="lg:sticky lg:top-10 bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_40px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col h-[calc(100vh-6rem)] max-h-[800px]">
      <div className="p-8 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        
        {/* Event & Show Info Header */}
        <div className="border-b border-slate-100 pb-5 mb-5">
          <h3 className="text-xl font-extrabold mb-3 tracking-tight text-[#0A1526]">{event.title}</h3>
          
          <div className="space-y-3 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 shrink-0 text-[#c29665]" />
              <span>{formattedShowDate}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-[#c29665]" />
              <span>{show.start_time.slice(0, 5)} {show.end_time ? `- ${show.end_time.slice(0, 5)}` : ""}</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-[#c29665] mt-0.5" />
              <span>
                {event.venue_name}<br/>
                <span className="text-xs text-slate-400 font-normal">{event.venue_city}, {event.venue_state}</span>
              </span>
            </div>
          </div>
        </div>

        {selectedSeats.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center opacity-70">
            <Ticket className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No seats selected yet</p>
            <p className="text-xs mt-2 text-slate-400">Click on available seats to add them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 mb-2">Selected Seats</h4>
            <div className="space-y-3">
              {selectedSeats.map(seat => (
                <div key={seat.id} className="flex justify-between items-center bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center bg-[#EEF2FF] text-[#3B41C5] font-bold rounded-lg border border-[#3B41C5]/20">
                      {seat.seat_number}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0A1526]">Row {seat.seat_number.replace(/[0-9]/g, '')}</p>
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{SEAT_TYPE_LABELS[seat.seat_type] || seat.seat_type}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#0A1526]">₹{parseFloat(seat.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {seatsByType.length > 1 && (
              <div className="bg-slate-50 rounded-xl p-4 mt-2">
                <div className="space-y-2">
                  {seatsByType.map(([type, { count, price }]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-slate-500 font-medium">
                        {SEAT_TYPE_LABELS[type] || type} × {count}
                      </span>
                      <span className="font-semibold text-[#0A1526]">₹{(price * count).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm text-slate-500 font-medium mb-2">
                <span>Tickets ({selectedSeats.length})</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 mb-4">
                <span>Taxes and fees calculated at checkout</span>
              </div>
              <div className="flex justify-between items-end mt-4">
                <span className="text-lg font-bold text-[#0A1526]">Total</span>
                <span className="text-3xl font-extrabold text-[#3B41C5]">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
            
          </div>
        )}

        {/* Timer UI (When Locked) */}
        {isLocked && countdown !== null && (
          <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Seats Reserved</p>
              <p className="text-[13px] text-amber-800 font-medium">Complete purchase in <span className="font-mono font-bold text-amber-600 ml-1">{formatTime(countdown)}</span></p>
            </div>
          </div>
        )}

      </div>
      
      {/* Sticky Action Footer inside Card */}
      <div className="p-6 bg-slate-50/50 border-t border-slate-100 mt-auto shrink-0">
        <Button
          className="w-full h-14 rounded-xl text-[15px] font-bold shadow-lg shadow-[#3B41C5]/20 bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white"
          onClick={isLocked ? onConfirmBooking : onLockSeats}
          disabled={isBooking || selectedSeats.length === 0 || (countdown !== null && countdown === 0)}
        >
          {isBooking ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : isLocked ? (
            <Ticket className="mr-2 h-5 w-5" />
          ) : (
            <Lock className="mr-2 h-5 w-5" />
          )}
          {isBooking 
            ? (isLocked ? "Confirming..." : "Reserving...") 
            : isLocked 
              ? "Continue to Booking" 
              : "Reserve Seats"}
        </Button>
      </div>
    </div>
  );
}
