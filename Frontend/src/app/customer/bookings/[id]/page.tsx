"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket as TicketIcon,
  CreditCard,
  Download,
  Info,
  XCircle,
  Loader2,
  RefreshCw
} from "lucide-react";

import { bookingService } from "@/services/booking.service";
import { Booking } from "@/types/customer-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { toast } = useToast();

  const fetchBookingDetails = useCallback(async () => {
    // Prevent synchronous setState in useEffect
    await Promise.resolve();

    try {
      setError(null);
      setErrorStatus(null);
      const data = await bookingService.getBookingDetails(bookingId);
      setBooking(data);
    } catch (err: unknown) {
      console.error("Failed to fetch booking details", err);
      const axiosErr = err as { response?: { status: number, data?: { detail?: string } }, message?: string };
      setErrorStatus(axiosErr?.response?.status || null);
      
      if (axiosErr?.response?.status === 404) {
        setError("Booking not found. Please check the reference number.");
      } else if (axiosErr?.response?.status === 403 || axiosErr?.response?.status === 401) {
        setError("You do not have permission to view this booking.");
      } else {
        setError(axiosErr?.message || "Failed to load booking details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      Promise.resolve().then(() => fetchBookingDetails());
    }
  }, [bookingId, fetchBookingDetails]);

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    setIsCancelling(true);
    try {
      await bookingService.cancelBooking(booking.booking_reference);
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
        variant: "default",
      });
      setShowCancelDialog(false);
      // Redirect to the bookings list page
      router.push("/customer/bookings");
    } catch (err: unknown) {
      console.error("Failed to cancel booking", err);
      const axiosErr = err as { response?: { data?: { detail?: string } }, message?: string };
      toast({
        title: "Cancellation Failed",
        description: axiosErr?.response?.data?.detail || axiosErr?.message || "Could not cancel the booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-200">CONFIRMED</Badge>;
      case "CANCELLED":
      case "REFUNDED":
        return <Badge variant="destructive">{status}</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-200">PENDING</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDerivedPaymentStatus = (bookingStatus: string) => {
    switch (bookingStatus) {
      case "CONFIRMED":
        return <span className="text-emerald-600 font-medium">SUCCESS</span>;
      case "CANCELLED":
      case "REFUNDED":
        return <span className="text-destructive font-medium">FAILED / REFUNDED</span>;
      case "PENDING":
        return <span className="text-amber-600 font-medium">PENDING</span>;
      default:
        return <span className="text-muted-foreground font-medium">UNKNOWN</span>;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Access Denied or Not Found"
          message={error || "Booking not found"}
          actionLabel="Back to Bookings"
          onAction={() => router.push("/customer/bookings")}
          type={errorStatus === 404 ? "404" : errorStatus === 401 || errorStatus === 403 ? "403" : "api"}
        />
      </div>
    );
  }

  // Safe fallback if image is not absolute URL
  const imageUrl = booking.event.event_image 
    ? booking.event.event_image.startsWith("http") 
      ? booking.event.event_image 
      : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${booking.event.event_image}`
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/customer/bookings")} aria-label="Go back" className="rounded-full bg-slate-50 hover:bg-slate-100 h-10 w-10 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#0A1526]">Booking Details</h1>
            <p className="text-slate-500 text-[13px] font-medium flex items-center mt-1 uppercase tracking-wider">
              Ref: <span className="font-mono font-bold ml-1 text-[#0A1526] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{booking.booking_reference}</span>
            </p>
          </div>
        </div>
        <div className="ml-auto sm:ml-0 flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fetchBookingDetails()}
            disabled={isLoading}
            className="hidden sm:flex text-slate-500 hover:text-[#0A1526] font-semibold"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchBookingDetails()}
            disabled={isLoading}
            className="sm:hidden text-slate-500 rounded-full bg-slate-50 h-10 w-10"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {getStatusBadge(booking.status)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
        
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            {imageUrl && (
              <div className="relative w-full h-48 sm:h-64 bg-slate-100">
                <Image 
                  src={imageUrl} 
                  alt={booking.event.title} 
                  fill 
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1526]/90 via-[#0A1526]/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">{booking.event.title}</h2>
                  <p className="text-white/80 text-sm mt-1 font-medium uppercase tracking-wider">Category {booking.event.category}</p>
                </div>
              </div>
            )}
            {!imageUrl && (
              <div className="bg-slate-50/50 p-6 sm:p-8 border-b border-slate-100">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1526]">{booking.event.title}</h2>
                <p className="text-slate-500 mt-1 font-medium">Event Details</p>
              </div>
            )}
            
            <div className={`grid sm:grid-cols-2 gap-8 p-6 sm:p-8`}>
              <div className="flex flex-col gap-1">
                <div className="flex items-center text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <Calendar className="mr-2 h-4 w-4 text-[#3B41C5]" /> Date
                </div>
                <p className="text-[15px] font-semibold text-[#0A1526]">{format(new Date(booking.show.show_date), "EEEE, MMMM d, yyyy")}</p>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <Clock className="mr-2 h-4 w-4 text-[#3B41C5]" /> Time
                </div>
                <p className="text-[15px] font-semibold text-[#0A1526]">
                  {booking.show.start_time.substring(0, 5)} - {booking.show.end_time.substring(0, 5)}
                </p>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2 pt-4 border-t border-slate-100">
                <div className="flex items-center text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  <MapPin className="mr-2 h-4 w-4 text-[#3B41C5]" /> Venue
                </div>
                <p className="text-[16px] font-bold text-[#0A1526]">{booking.venue.name}</p>
                <p className="text-[14px] font-medium text-slate-500 mt-1">{booking.venue.address}, {booking.venue.city}, {booking.venue.state} {booking.venue.pincode}</p>
              </div>
            </div>
          </div>

          {/* Seat Details */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h2 className="flex items-center text-xl font-bold text-[#0A1526]">
                <TicketIcon className="mr-2 h-6 w-6 text-[#3B41C5]" /> 
                Selected Seats ({booking.seats.length})
              </h2>
            </div>
            <div className="p-6 md:p-8 bg-slate-50/50">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-[14px]">
                  <thead className="bg-slate-50 text-slate-500 text-left font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-4">Row</th>
                      <th className="px-5 py-4">Seat</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {booking.seats.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4 font-semibold text-[#0A1526]">{item.seat.row}</td>
                        <td className="px-5 py-4 font-semibold text-[#0A1526]">{item.seat.seat_number}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                            {item.seat.seat_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[#0A1526]">₹{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h2 className="text-xl font-bold text-[#0A1526]">Order Summary</h2>
            </div>
            <div className="p-6 md:p-8 space-y-5 bg-slate-50/50">
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-slate-500 font-medium">Booking ID</span>
                <span className="font-mono font-bold text-[#0A1526] bg-white px-2 py-1 rounded border border-slate-100">{booking.booking_reference}</span>
              </div>
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-slate-500 font-medium">Date Booked</span>
                <span className="font-bold text-[#0A1526]">{format(new Date(booking.created_at), "MMM d, yyyy, h:mm a")}</span>
              </div>
              <div className="h-px bg-slate-200 w-full my-4" />
              <div className="flex justify-between items-center text-[14px]">
                <span className="text-slate-500 font-medium">Payment Status</span>
                {getDerivedPaymentStatus(booking.status)}
              </div>
              <div className="h-px bg-slate-200 w-full my-4" />
              <div className="flex justify-between items-end pt-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[12px] mb-1">Total Amount</span>
                <span className="text-3xl font-extrabold text-[#3B41C5]">₹{booking.total_amount}</span>
              </div>
            </div>
            {booking.status === "CONFIRMED" && (
              <div className="p-6 border-t border-slate-100 bg-white">
                <Button className="w-full h-14 rounded-xl font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white shadow-lg shadow-[#3B41C5]/20 text-[15px]" asChild>
                  <Link href={booking.ticket_number ? `/customer/tickets/${booking.ticket_number}` : '#'}>
                    <Download className="mr-2 h-5 w-5" /> Download Digital Ticket
                  </Link>
                </Button>
              </div>
            )}
            {booking.status === "PENDING" && (
              <div className="p-6 border-t border-slate-100 bg-white space-y-3">
                <Button className="w-full h-14 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 text-[15px]" asChild>
                  <Link href={`/booking/${booking.booking_reference}/payment`}>
                    <CreditCard className="mr-2 h-5 w-5" /> Complete Payment
                  </Link>
                </Button>
              </div>
            )}
            
            {/* Cancellation UI */}
            {booking.status !== "CANCELLED" && booking.status !== "REFUNDED" && (
              <div className={`p-6 bg-white flex flex-col gap-3 ${booking.status === "PENDING" || booking.status === "CONFIRMED" ? 'pt-0 border-none' : 'border-t border-slate-100'}`}>
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-[14px] font-bold transition-colors h-12 px-4 py-2 text-red-500 bg-red-50 hover:bg-red-100 border-none">
                    <XCircle className="mr-2 h-5 w-5" /> Cancel Booking
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px] rounded-[2rem] border-slate-100 p-8 shadow-xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold text-[#0A1526]">Cancel Booking</DialogTitle>
                      <DialogDescription className="text-[15px] font-medium text-slate-500 mt-3">
                        Are you sure you want to cancel booking <span className="font-mono text-[#0A1526] font-bold">{booking.booking_reference}</span>? 
                        This action cannot be undone.
                        {booking.status === "CONFIRMED" && " Refunds will be processed according to our cancellation policy."}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 flex gap-3 sm:gap-0">
                      <Button variant="outline" className="rounded-xl h-12 font-bold text-slate-600" onClick={() => setShowCancelDialog(false)} disabled={isCancelling}>
                        Keep Booking
                      </Button>
                      <Button variant="destructive" className="rounded-xl h-12 font-bold bg-red-500 hover:bg-red-600" onClick={handleCancelBooking} disabled={isCancelling}>
                        {isCancelling ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling...
                          </>
                        ) : (
                          "Yes, Cancel Booking"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          <div className="bg-[#FAF8F5] border border-[#c29665]/20 rounded-2xl p-5 flex gap-4 text-[14px] text-slate-600 shadow-sm">
            <Info className="h-6 w-6 flex-shrink-0 text-[#c29665]" />
            <p className="font-medium leading-relaxed">
              Need help with your booking? Contact our support team and quote your Booking ID: <span className="font-mono font-bold text-[#0A1526]">{booking.booking_reference}</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
