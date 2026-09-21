"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Calendar, 
  ChevronRight, 
  AlertCircle,
  RefreshCw,
  Ticket,
  Search
} from "lucide-react";

import { organizerBookingService } from "@/services/organizer-booking.service";
import { Booking } from "@/types/booking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function OrganizerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBookings = useCallback(async (page: number = currentPage) => {
    // Prevent synchronous setState
    await Promise.resolve();
    try {
      setIsRefreshing(true);
      setError(null);
      const filterParam = statusFilter !== "ALL" ? statusFilter : undefined;
      const data = await organizerBookingService.getOrganizerBookings(filterParam, page);
      
      const sorted = data.results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setBookings(sorted);
      setTotalCount(data.count);
      // Assuming default DRF page size is 10
      setTotalPages(Math.ceil(data.count / 10) || 1);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    } catch (err: unknown) {
      console.error("Failed to fetch organizer bookings", err);
      const axiosErr = err as { response?: { status: number }, message?: string };
      // Format 403 nicely if it happens
      if (axiosErr?.response?.status === 403) {
        setError("Access Denied: The backend currently restricts the booking list endpoint to Customers only.");
      } else {
        setError(axiosErr?.message || "Failed to load bookings. Please try again later.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, statusFilter]);

  useEffect(() => {
    // Reset to page 1 when backend-supported filter changes
    setCurrentPage(1);
    fetchBookings(1);
  }, [statusFilter, fetchBookings]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchBookings(currentPage);
  };

  // Pagination Handlers
  const goToNextPage = () => {
    if (hasNext) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchBookings(nextPage);
    }
  };

  const goToPrevPage = () => {
    if (hasPrev) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchBookings(prevPage);
    }
  };

  const goToFirstPage = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      fetchBookings(1);
    }
  };

  const goToLastPage = () => {
    if (currentPage !== totalPages) {
      setCurrentPage(totalPages);
      fetchBookings(totalPages);
    }
  };

  useEffect(() => {
    let result = bookings;
    
    // Client-side search as fallback since backend lacks SearchFilter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.booking_reference.toLowerCase().includes(query) ||
        b.event.title.toLowerCase().includes(query)
      );
    }
    
    // Defer setState
    Promise.resolve().then(() => setFilteredBookings(result));
  }, [bookings, searchQuery]);

  type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | null | undefined;
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "success";
      case "PENDING":
        return "warning";
      case "CANCELLED":
      case "REFUNDED":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (isLoading && !isRefreshing) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-2">Manage bookings for your events.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Error Loading Bookings</h3>
            <p className="text-red-600 dark:text-red-300 mb-6 max-w-md">{error}</p>
            <Button onClick={handleRefresh} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  {totalCount > 0 ? `Showing ${totalCount} customer bookings` : "View and manage all customer bookings"}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search ref or event..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <EmptyState
                icon={<Ticket className="h-12 w-12 text-muted-foreground" />}
                title="No bookings found"
                message={
                  searchQuery || statusFilter !== "ALL" 
                    ? "No bookings match your current search and filters." 
                    : "There are currently no bookings for your events."
                }
                actionLabel={(searchQuery || statusFilter !== "ALL") ? "Clear Filters" : undefined}
                onAction={(searchQuery || statusFilter !== "ALL") ? () => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                } : undefined}
              />
            ) : (
              <div className="space-y-4">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-tl-lg">Booking ID</th>
                        <th className="px-4 py-3 font-medium">Event & Show</th>
                        <th className="px-4 py-3 font-medium">Customer</th>
                        <th className="px-4 py-3 font-medium">Seats</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Payment</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                      {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4">
                            <span className="font-medium">{booking.booking_reference}</span>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(booking.created_at), "MMM d, yyyy")}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium truncate max-w-[150px]" title={booking.event.title}>
                              {booking.event.title}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center mt-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              {booking.show.show_date}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            <span className="italic">N/A</span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline">{booking.seats?.length || 0}</Badge>
                          </td>
                          <td className="px-4 py-4 font-medium">
                            ${booking.total_amount}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            <span className="italic">N/A</span>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={getStatusVariant(booking.status) as BadgeVariant}>
                              {booking.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/organizer/bookings/${booking.booking_reference}`}>
                                View <ChevronRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-card border rounded-lg p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-sm">{booking.booking_reference}</span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(booking.created_at), "MMM d, yyyy")}
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(booking.status) as BadgeVariant}>
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className="pt-2 border-t border-border/50">
                        <div className="font-medium text-sm truncate" title={booking.event.title}>
                          {booking.event.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {booking.show.show_date} • {booking.seats?.length || 0} seats
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-sm">${booking.total_amount}</span>
                        <Button variant="outline" size="sm" asChild className="h-8">
                          <Link href={`/organizer/bookings/${booking.booking_reference}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToFirstPage}
                      disabled={currentPage === 1 || isRefreshing}
                    >
                      First
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToPrevPage}
                      disabled={!hasPrev || isRefreshing}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToNextPage}
                      disabled={!hasNext || isRefreshing}
                    >
                      Next
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToLastPage}
                      disabled={currentPage === totalPages || isRefreshing}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
