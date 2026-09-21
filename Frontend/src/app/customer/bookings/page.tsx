"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  Ticket, 
  Calendar, 
  Search, 
  ChevronRight, 
  AlertCircle,
  Clock,
  RefreshCw,
  MapPin,
  CreditCard
} from "lucide-react";

import { bookingService } from "@/services/booking.service";
import { Booking } from "@/types/customer-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 5; // Assuming we want 5 bookings per page, or easily configurable

  const fetchBookings = async () => {
    // Prevent synchronous setState
    await Promise.resolve();
    try {
      setIsRefreshing(true);
      setError(null);
      // The backend uses JWT auth automatically, so it only returns the logged-in customer's bookings.
      const data = await bookingService.getBookings();
      
      // Sort by newest first
      const sorted = data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setBookings(sorted);
      
      // Re-apply current filters to the new data immediately
      let result = sorted;
      if (statusFilter !== "ALL") {
        const now = new Date();
        result = result.filter(b => {
          const showDateTime = new Date(`${b.show.show_date}T${b.show.start_time}`);
          if (statusFilter === "UPCOMING") return (b.status === "CONFIRMED" || b.status === "PENDING") && showDateTime > now;
          if (statusFilter === "COMPLETED") return b.status === "CONFIRMED" && showDateTime <= now;
          if (statusFilter === "CANCELLED") return b.status === "CANCELLED" || b.status === "REFUNDED";
          return true;
        });
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(b => 
          b.event.title.toLowerCase().includes(query) || 
          b.booking_reference.toLowerCase().includes(query) ||
          b.venue.name.toLowerCase().includes(query)
        );
      }
      setFilteredBookings(result);
    } catch (err: unknown) {
      console.error("Failed to fetch bookings", err);
      const axiosErr = err as { message?: string };
      setError(axiosErr?.message || "Failed to load your bookings. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchBookings());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Apply filters
    let result = bookings;
    
    if (statusFilter === "ALL") {
      result = result.filter(b => b.status !== "CANCELLED" && b.status !== "REFUNDED");
    } else if (statusFilter !== "ALL") {
      const now = new Date();
      result = result.filter(b => {
        const showDateTime = new Date(`${b.show.show_date}T${b.show.start_time}`);
        
        if (statusFilter === "UPCOMING") {
          return (b.status === "CONFIRMED" || b.status === "PENDING") && showDateTime > now;
        }
        if (statusFilter === "COMPLETED") {
          return b.status === "CONFIRMED" && showDateTime <= now;
        }
        if (statusFilter === "CANCELLED") {
          return b.status === "CANCELLED" || b.status === "REFUNDED";
        }
        return true;
      });
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.event.title.toLowerCase().includes(query) || 
        b.booking_reference.toLowerCase().includes(query) ||
        b.venue.name.toLowerCase().includes(query)
      );
    }
    
    // Prevent synchronous setState in useEffect
    Promise.resolve().then(() => {
      setFilteredBookings(result);
      setCurrentPage(1); // Reset to first page when filters change
    });
  }, [searchQuery, statusFilter, bookings]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none">CONFIRMED</Badge>;
      case "CANCELLED":
      case "REFUNDED":
        return <Badge variant="destructive" className="border-none">{status}</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none">PENDING</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDerivedPaymentStatus = (bookingStatus: string) => {
    // Since payment status isn't explicitly returned in the booking list endpoint,
    // we derive it from the booking status according to the domain logic.
    switch (bookingStatus) {
      case "CONFIRMED":
        return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">SUCCESS</Badge>;
      case "CANCELLED":
      case "REFUNDED":
        return <Badge variant="outline" className="text-destructive border-red-200 bg-red-50">FAILED / REFUNDED</Badge>;
      case "PENDING":
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">PENDING</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A1526]">My Bookings</h1>
        <p className="text-slate-500 mt-2 font-medium">View and manage your ticket bookings.</p>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 md:p-8 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-[#0A1526]">All Transactions</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchBookings}
                disabled={isRefreshing || isLoading}
                className="text-slate-400 hover:text-[#0A1526] h-8 px-2"
                title="Refresh bookings"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search events, IDs..."
                  className="w-full sm:w-64 pl-10 h-10 rounded-xl border-slate-200 focus-visible:ring-[#3B41C5] font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter(val || "ALL")}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 font-medium">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="ALL" className="font-medium rounded-lg">All Bookings</SelectItem>
                    <SelectItem value="UPCOMING" className="font-medium rounded-lg">Upcoming</SelectItem>
                    <SelectItem value="COMPLETED" className="font-medium rounded-lg">Completed</SelectItem>
                    <SelectItem value="CANCELLED" className="font-medium rounded-lg">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 md:p-8 bg-slate-50/50">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-red-50 p-4 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-lg font-bold text-[#0A1526]">Failed to load bookings</p>
              <p className="text-[15px] font-medium text-slate-500 mt-1 max-w-sm">{error}</p>
              <Button className="mt-6 h-12 px-6 rounded-xl font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {paginatedBookings.map((booking) => (
                  <div key={booking.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row hover:border-[#3B41C5]/30 transition-colors">
                    {/* Optional image block if you have image in event (placeholder used for layout) */}
                    <div className="md:w-48 h-32 md:h-auto bg-slate-100 flex items-center justify-center shrink-0 border-r border-slate-100 relative">
                       {booking.event.event_image ? (
                         <img src={booking.event.event_image} alt={booking.event.title} className="w-full h-full object-cover" />
                       ) : (
                         <Calendar className="h-10 w-10 text-slate-300" />
                       )}
                       <div className="absolute top-3 left-3">
                         {getStatusBadge(booking.status)}
                       </div>
                    </div>
                    
                    <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-extrabold text-xl text-[#0A1526] line-clamp-1">{booking.event.title}</h3>
                          <p className="font-bold text-[#3B41C5] whitespace-nowrap">₹{booking.total_amount}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-4">
                          <div className="flex items-center text-[13px] font-medium text-slate-500">
                            <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                            {format(new Date(booking.show.show_date), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center text-[13px] font-medium text-slate-500">
                            <Clock className="mr-2 h-4 w-4 text-slate-400" />
                            {booking.show.start_time.substring(0, 5)}
                          </div>
                          <div className="flex items-center text-[13px] font-medium text-slate-500 sm:col-span-2">
                            <MapPin className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                            <span className="truncate">{booking.venue.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-100 gap-4 mt-auto">
                        <div className="flex flex-col gap-1 text-[12px] font-medium">
                          <span className="text-slate-400 uppercase tracking-wider">Ref ID</span>
                          <span className="font-mono text-[#0A1526] bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            {booking.booking_reference}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-1 text-[12px] font-medium">
                          <span className="text-slate-400 uppercase tracking-wider">Tickets</span>
                          <span className="text-[#0A1526]">
                            {booking.seats.length} {booking.seats.length === 1 ? 'Seat' : 'Seats'}
                          </span>
                        </div>
                        
                        <div className="w-full sm:w-auto mt-2 sm:mt-0">
                          <Button variant="default" className="w-full sm:w-auto h-10 px-5 rounded-xl font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white" asChild>
                            <Link href={`/customer/bookings/${booking.booking_reference}`}>
                              View Details <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-200 mt-6 gap-4">
                  <div className="text-[13px] font-medium text-slate-500">
                    Showing <span className="font-bold text-[#0A1526]">{startIndex + 1}</span> to{" "}
                    <span className="font-bold text-[#0A1526]">
                      {Math.min(endIndex, filteredBookings.length)}
                    </span>{" "}
                    of <span className="font-bold text-[#0A1526]">{filteredBookings.length}</span> results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-slate-200 font-semibold text-slate-600"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-slate-200 font-semibold text-slate-600"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-[13px] font-bold text-[#0A1526] px-3">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-slate-200 font-semibold text-slate-600"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-slate-200 font-semibold text-slate-600"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Ticket className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-[#0A1526] mb-2">No bookings found</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto mb-6">
                {searchQuery || statusFilter !== "ALL"
                  ? "We couldn't find any bookings matching your filters. Try adjusting your search."
                  : "You haven't made any bookings yet. Browse our events to find your next experience!"}
              </p>
              <Button
                className="h-12 px-6 rounded-xl font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white"
                onClick={() => {
                  if (searchQuery || statusFilter !== "ALL") {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  } else {
                    router.push("/events");
                  }
                }}
              >
                {searchQuery || statusFilter !== "ALL" ? "Clear Filters" : "Browse Events"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}