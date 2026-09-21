"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { EventDetail } from "@/types/event";
import { Show, SeatAvailability } from "@/types/booking";
import { eventService } from "@/services/event.service";
import { bookingService } from "@/services/booking.service";
import { Button } from "@/components/ui/button";
import { ChevronLeft, AlertCircle, Loader2, Lock, Ticket } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { BookingErrorInfo, classifyBookingError } from "@/lib/booking-errors";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  const eventId = params.id as string;
  const showId = params.showId as string;
  
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [show, setShow] = useState<Show | null>(null);
  const [seats, setSeats] = useState<SeatAvailability[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<BookingErrorInfo | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    // Auth redirect — preserve the intended booking URL so the user
    // can return to the booking flow after logging in.
    if (!authLoading && !isAuthenticated) {
      const currentPath = `/events/${eventId}/book/${showId}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    if (authLoading || !isAuthenticated) return;
    
    // Only CUSTOMERs can use the booking flow.
    // ADMIN/ORGANIZER are redirected to their dashboards.
    if (user && user.role !== UserRole.CUSTOMER) {
      if (user.role === UserRole.ADMIN) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/organizer/dashboard");
      }
      return;
    }
    
    const fetchBookingData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch event, all shows (to find the specific one), and seat availability
        const [eventData, showsData, seatsData] = await Promise.all([
          eventService.getEventDetail(eventId),
          bookingService.getShows({ event: eventId }),
          bookingService.getAvailableSeats(showId)
        ]);
        
        setEvent(eventData);
        
        const currentShow = showsData.find(s => s.id.toString() === showId);
        if (!currentShow) {
          throw new Error("Show not found or unavailable.");
        }
        setShow(currentShow);
        setSeats(seatsData);
        
      } catch (err) {
        console.error("Failed to load booking data:", err);
        const loadInfo = classifyBookingError(err, "load");
        setError(loadInfo.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingData();
  }, [eventId, showId, isAuthenticated, authLoading, user, router]);

  // Timer Effect
  useEffect(() => {
    if (!lockExpiresAt) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = lockExpiresAt.getTime() - now;
      
      if (distance <= 0) {
        clearInterval(interval);
        setCountdown(0);
        setIsLocked(false);
        setLockExpiresAt(null);
        setValidationError("Seat reservation expired. Please select and reserve your seats again.");
        // Refresh seats to get actual backend state
        bookingService.getAvailableSeats(showId).then(setSeats).catch(console.error);
      } else {
        setCountdown(Math.floor(distance / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lockExpiresAt, showId]);

  // Warn the user when they try to leave the page (close tab, refresh, address bar)
  // while they still have seats selected or locked. Browser-native prompt only fires
  // when a selection exists, so it never appears unnecessarily.
  useEffect(() => {
    if (selectedSeatIds.length === 0) return;
    const handleBeforeUnload = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [selectedSeatIds]);

  const toggleSeatSelection = (seat: SeatAvailability) => {
    if (isLocked) return; // Prevent changing selection while locked
    setValidationError(null);
    setBookingError(null);
    
    if (seat.status !== "AVAILABLE") {
      setValidationError(`Seat ${seat.row}${seat.seat_number} is not available.`);
      return;
    }
    
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter(id => id !== seat.id);
      } else {
        if (prev.length >= 10) {
          setValidationError("You can only select up to 10 seats per booking.");
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  const handleLockSeats = async () => {
    setValidationError(null);
    setBookingError(null);
    if (selectedSeatIds.length === 0) {
      setValidationError("Please select at least one seat to continue.");
      return;
    }
    
    try {
      setIsBooking(true);
      const res = await bookingService.lockSeats(Number(showId), selectedSeatIds);
      setIsLocked(true);
      setLockExpiresAt(new Date(res.expires_at));
      setCountdown(res.remaining_seconds);
    } catch (err: any) {
      console.warn("Locking failed:", err.message || err);
      const info = classifyBookingError(err, "lock");
      setBookingError(info);
      // Seats may have changed underneath the user — refresh the map and clear
      // the selection whenever the failure is seat- or lock-related.
      if (info.action === "refresh-seats") {
        try {
          const seatsData = await bookingService.getAvailableSeats(showId);
          setSeats(seatsData);
          setSelectedSeatIds([]);
        } catch (refreshErr) {
          console.error("Failed to refresh seats after lock error:", refreshErr);
        }
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!isLocked) return;
    try {
      setIsBooking(true);
      setValidationError(null);
      const booking = await bookingService.createBooking(Number(showId), selectedSeatIds);
      // Successful booking — navigate to the booking confirmation page
      router.push(`/customer/bookings/confirmation/${booking.booking_reference}`);
    } catch (err) {
      console.error("Booking failed:", err);
      const info = classifyBookingError(err, "booking");
      setBookingError(info);

      // If the lock is no longer valid or seats were taken, reset the lock state
      if (info.kind === "SEAT_LOCK_EXPIRED" || info.kind === "SEAT_UNAVAILABLE") {
        setIsLocked(false);
        setLockExpiresAt(null);
        setCountdown(null);
        // Refresh seat availability to reflect the latest backend state
        try {
          const seatsData = await bookingService.getAvailableSeats(showId);
          setSeats(seatsData);
          setSelectedSeatIds([]);
        } catch (refreshErr) {
          console.error("Failed to refresh seats after booking error:", refreshErr);
        }
      }
    } finally {
      setIsBooking(false);
    }
  };

  const runRecovery = (info: BookingErrorInfo) => {
    setBookingError(null);
    switch (info.action) {
      case "refresh-seats": {
        setIsLocked(false);
        setLockExpiresAt(null);
        setCountdown(null);
        bookingService
          .getAvailableSeats(showId)
          .then((seatsData) => {
            setSeats(seatsData);
            setSelectedSeatIds([]);
          })
          .catch((refreshErr) => console.error("Failed to refresh seats:", refreshErr));
        break;
      }
      case "retry":
        if (info.phase === "lock") void handleLockSeats();
        else if (info.phase === "booking") void handleConfirmBooking();
        else window.location.reload();
        break;
      case "back-to-events":
        router.push("/events");
        break;
      case "login":
        router.push("/login");
        break;
      default:
        window.location.reload();
    }
  };

  const handleBackToEvent = () => {
    if (selectedSeatIds.length > 0) {
      setPendingNavigation(`/events/${eventId}`);
      setShowLeaveWarning(true);
      return;
    }
    router.push(`/events/${eventId}`);
  };

  const handleStayOnPage = () => {
    setShowLeaveWarning(false);
    setPendingNavigation(null);
  };

  const handleLeaveNow = () => {
    const target = pendingNavigation;
    setShowLeaveWarning(false);
    setPendingNavigation(null);
    // Best-effort release of any active lock so the seats become available to
    // other customers sooner. The backend also expires locks automatically.
    if (isLocked && selectedSeatIds.length > 0) {
      bookingService.releaseSeats(Number(showId), selectedSeatIds).catch(() => {});
    }
    if (target) router.push(target);
  };

  // Group seats by row for rendering
  const seatRows = useMemo(() => {
    const rows: Record<string, SeatAvailability[]> = {};
    seats.forEach(seat => {
      if (!rows[seat.row]) rows[seat.row] = [];
      rows[seat.row].push(seat);
    });
    // Sort rows alphabetically (e.g. A, B, C)
    return Object.entries(rows).sort(([rowA], [rowB]) => rowA.localeCompare(rowB));
  }, [seats]);

  const selectedSeatsData = useMemo(() => {
    return seats.filter(s => selectedSeatIds.includes(s.id));
  }, [seats, selectedSeatIds]);
  
  const totalAmount = useMemo(() => {
    return selectedSeatsData.reduce((sum, seat) => sum + parseFloat(seat.price), 0);
  }, [selectedSeatsData]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Extract unique seat types and their exact prices from backend data for the legend
  const seatPricingLegend = useMemo(() => {
    const typesMap = new Map<string, string>(); // seat_type -> price
    seats.forEach(seat => {
      if (!typesMap.has(seat.seat_type)) {
        typesMap.set(seat.seat_type, parseFloat(seat.price).toFixed(2));
      }
    });
    // Sort so VIP is generally first if present
    return Array.from(typesMap.entries()).sort((a, b) => b[1].localeCompare(a[1]));
  }, [seats]);

  if (authLoading || isLoading) {
    return (
      <div className="pt-20 pb-24 lg:pb-20 px-4 md:px-6">
        <PageSkeleton />
      </div>
    );
  }

  if (error || !event || !show) {
    return (
      <div className="pt-20">
        <ErrorState 
          title="Booking Error"
          message={error || "Something went wrong."}
          onRetry={() => window.location.reload()}
        />
        <div className="flex justify-center mt-4 mb-20">
          <Button onClick={() => router.push(`/events/${eventId}`)} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24 lg:pb-20">
      <div className="bg-white py-8 border-b border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <div className="container mx-auto px-4 md:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToEvent}
            className="mb-5 text-slate-500 hover:text-[#0A1526]"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A1526] mb-3">Select Your Seats</h1>
            <p className="text-slate-500 text-lg">Pick the best available seats from the layout below.</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Seat Layout Area */}
          <div className="lg:col-span-2 space-y-8">
            {validationError && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 border border-destructive/20 transition-all">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="font-medium text-sm">{validationError}</p>
              </div>
            )}

            {bookingError && (
              <div className="flex items-start gap-3 bg-destructive/15 border border-destructive/20 rounded-xl px-4 py-4">
                <AlertCircle className="h-6 w-6 shrink-0 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-destructive">{bookingError.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{bookingError.message}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => runRecovery(bookingError)}
                  >
                    {bookingError.recovery}
                  </Button>
                </div>
              </div>
            )}
            
            <div className="bg-white p-6 sm:p-8 md:p-12 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto">
              
              {/* Screen Indicator */}
              <div className="w-full max-w-2xl mx-auto mb-16">
                <div className="h-2.5 bg-gradient-to-r from-transparent via-[#3B41C5]/40 to-transparent rounded-full mb-3"></div>
                <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-[0.3em]">Screen / Stage</p>
              </div>

              {seats.length === 0 ? (
                <EmptyState 
                  title="No Seats Available" 
                  message="This venue has no seats configured for this show." 
                />
              ) : (
                <div className="flex flex-col gap-4 items-center min-w-max">
                  {seatRows.map(([row, rowSeats]) => (
                    <div key={row} className="flex items-center gap-3 sm:gap-4">
                      <div className="w-7 sm:w-8 text-center font-bold text-muted-foreground text-sm">{row}</div>
                      <div className="flex gap-1.5 sm:gap-2">
                        {rowSeats.map((seat) => {
                          const isAvailable = seat.status === "AVAILABLE";
                          const isBooked = seat.status === "BOOKED";
                          const isLocked = seat.status === "LOCKED";
                          const isSelected = selectedSeatIds.includes(seat.id);
                          
                          let seatClass = "bg-slate-100 text-slate-300 border-transparent cursor-not-allowed opacity-50"; // Default UNAVAILABLE
                          
                          if (isSelected) {
                            seatClass = "bg-[#3B41C5] border-[#3B41C5] text-white shadow-md shadow-[#3B41C5]/30 ring-2 ring-[#3B41C5] ring-offset-2 ring-offset-white";
                          } else if (isAvailable) {
                            // Differentiate by seat type if desired, but keep it clean
                            seatClass = seat.seat_type === "VIP" 
                              ? "bg-amber-50 border-amber-300 hover:border-amber-400 hover:bg-amber-100 text-amber-900 cursor-pointer"
                              : seat.seat_type === "PREMIUM"
                                ? "bg-indigo-50 border-indigo-200 hover:border-[#3B41C5] hover:bg-indigo-100 text-[#3B41C5] cursor-pointer"
                                : "bg-white border-slate-300 hover:border-[#3B41C5] hover:text-[#3B41C5] cursor-pointer text-slate-700";
                          } else if (isBooked) {
                            seatClass = "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-60";
                          } else if (isLocked) {
                            seatClass = "bg-orange-100 text-orange-400 border-orange-200 cursor-not-allowed opacity-70";
                          }
                          
                          return (
                            <button
                              key={seat.id}
                              disabled={!isAvailable && !isSelected}
                              onClick={() => toggleSeatSelection(seat)}
                              className={`h-9 w-9 sm:h-10 sm:w-10 flex flex-col items-center justify-center rounded-t-lg rounded-b-sm border-2 text-xs font-semibold transition-all relative ${seatClass}`}
                              title={`${row}${seat.seat_number} - ${seat.seat_type} - ₹${seat.price} (${seat.status})`}
                            >
                              <span>{seat.seat_number}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="w-8 text-center font-bold text-muted-foreground">{row}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Unified Legend */}
              <div className="mt-12 pt-6 border-t space-y-6">
                
                {/* Seat Pricing Categories */}
                {seatPricingLegend.length > 0 && (
                  <div className="flex flex-col items-center gap-3">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pricing Categories</h4>
                    <div className="flex flex-wrap justify-center gap-6">
                      {seatPricingLegend.map(([type, price]) => {
                        let indicatorClass = "bg-background border-border";
                        if (type === "VIP") indicatorClass = "bg-amber-50 border-amber-300";
                        else if (type === "PREMIUM") indicatorClass = "bg-indigo-50 border-indigo-200";

                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-t border-2 ${indicatorClass}`}></div>
                            <span className="text-sm font-medium">
                              {type} - <span className="text-muted-foreground">₹{price}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Seat Statuses */}
                <div className="flex flex-col items-center gap-3 pt-2">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Availability</h4>
                  <div className="flex flex-wrap justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-t border-2 border-slate-300 bg-white"></div>
                      <span className="text-sm font-medium text-slate-500">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-t border-2 border-[#3B41C5] bg-[#3B41C5]"></div>
                      <span className="text-sm font-medium text-slate-500">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-t border-2 border-slate-300 bg-slate-200 opacity-60"></div>
                      <span className="text-sm font-medium text-slate-500">Booked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-t border-2 border-orange-200 bg-orange-100 opacity-70"></div>
                      <span className="text-sm font-medium text-slate-500">Locked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-t border-2 border-transparent bg-slate-100 opacity-50"></div>
                      <span className="text-sm font-medium text-slate-500">Unavailable</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
          
          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <BookingSummary 
              event={event}
              show={show}
              selectedSeats={selectedSeatsData}
              isLocked={isLocked}
              countdown={countdown}
              isBooking={isBooking}
              onLockSeats={handleLockSeats}
              onConfirmBooking={handleConfirmBooking}
            />
          </div>
          
        </div>
      </div>

      {/* Mobile sticky booking bar — hidden on lg and above */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-card border-t border-border shadow-lg px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1 leading-none">
            {isLocked && countdown !== null ? "Your Reservation" : "Your Selection"}
          </p>
          <p className="font-bold text-lg leading-tight truncate">
            {selectedSeatsData.length === 0 && !(isLocked && countdown !== null) ? (
              <span className="text-muted-foreground">No seats selected</span>
            ) : (
              <>
                <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
                <span className="text-muted-foreground text-sm"> · {selectedSeatsData.length} {selectedSeatsData.length === 1 ? "ticket" : "tickets"}</span>
              </>
            )}
          </p>
          {isLocked && countdown !== null ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Reserved for <span className="font-mono font-semibold">{formatCountdown(countdown)}</span>
            </p>
          ) : selectedSeatsData.length === 0 ? (
            <p className="text-xs text-muted-foreground mt-0.5">Tap available seats to add them</p>
          ) : null}
        </div>
        <Button
          className="h-11 shrink-0 px-4 shadow-sm"
          onClick={isLocked && countdown !== null ? handleConfirmBooking : handleLockSeats}
          disabled={isBooking || (countdown !== null && countdown === 0) || (selectedSeatsData.length === 0 && !(isLocked && countdown !== null))}
        >
          {isBooking ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : isLocked && countdown !== null ? (
            <Ticket className="mr-1.5 h-4 w-4" />
          ) : (
            <Lock className="mr-1.5 h-4 w-4" />
          )}
          {isBooking
            ? (isLocked && countdown !== null ? "Confirming..." : "Reserving...")
            : isLocked && countdown !== null
              ? "Continue to Booking"
              : "Reserve Seats"}
        </Button>
      </div>

      {/* Clean confirmation UI — intercepted in-app navigation away from the booking flow */}
      <ConfirmDialog
        isOpen={showLeaveWarning}
        onClose={handleStayOnPage}
        onConfirm={handleLeaveNow}
        title="Leave Seat Selection?"
        description={
          isLocked
            ? "Your seats are currently locked. If you leave now, the reservation will be abandoned and those seats may be released to other customers."
            : "You have selected seats but haven't reserved them yet. If you leave now, your selection will be lost and nothing will be held for you."
        }
        confirmText="Leave Page"
        cancelText="Keep Seats"
      />
    </div>
  );
}
