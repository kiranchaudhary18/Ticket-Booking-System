"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { 
  Ticket as TicketIcon, 
  Search, 
  ShieldAlert
} from "lucide-react";

import { adminService } from "@/services/admin.service";
import { AdminBooking, AdminBookingFilters } from "@/types/admin";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DataTable, ColumnDef } from "@/components/admin/DataTable";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [orderingFilter, setOrderingFilter] = useState("-created_at");
  
  // Debounced Search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters: AdminBookingFilters = {
        page
      };
      
      if (debouncedSearch) filters.search = debouncedSearch;
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (dateFilter) filters.date = dateFilter;
      if (orderingFilter) filters.ordering = orderingFilter;
      
      const response = await adminService.getBookings(filters);
      
      setBookings(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / 10) || 1); // Assuming 10 items per page
    } catch (err: unknown) {
      console.error("Failed to fetch bookings", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load bookings.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, dateFilter, orderingFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings();
  }, [fetchBookings]);

  const getStatusColor = (statusStr: string) => {
    switch (statusStr) {
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPaymentStatusColor = (statusStr: string | null) => {
    if (!statusStr) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    
    switch (statusStr) {
      case "SUCCESS":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "PENDING":
      case "CREATED":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      case "REFUNDED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const columns: ColumnDef<AdminBooking>[] = [
    {
      header: "Reference / Date",
      cell: (booking) => (
        <>
          <div className="font-medium text-primary">#{booking.booking_reference}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(booking.created_at), "MMM d, yyyy h:mm a")}
          </div>
        </>
      ),
    },
    {
      header: "Customer",
      cell: (booking) => (
        <>
          <div className="font-medium">{booking.customer.first_name} {booking.customer.last_name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {booking.customer.email}
          </div>
        </>
      ),
    },
    {
      header: "Event / Organizer",
      cell: (booking) => (
        <>
          <div className="font-medium line-clamp-1" title={booking.event?.title}>
            {booking.event?.title || "Unknown Event"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Org ID: {booking.event?.organizer || "-"}
          </div>
        </>
      ),
    },
    {
      header: "Seats",
      cell: (booking) => <div className="font-medium">{booking.seats?.length || 0} seats</div>,
    },
    {
      header: "Amount",
      headerClassName: "text-right",
      className: "text-right font-medium",
      cell: (booking) => `₹${booking.total_amount}`,
    },
    {
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      cell: (booking) => (
        <Badge className={`${getStatusColor(booking.status)} whitespace-nowrap`}>
          {booking.status}
        </Badge>
      ),
    },
    {
      header: "Payment",
      headerClassName: "text-center",
      className: "text-center",
      cell: (booking) => (
        <Badge className={`${getPaymentStatusColor(booking.payment_status)} whitespace-nowrap`}>
          {booking.payment_status || "UNPAID"}
        </Badge>
      ),
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="Bookings" 
        description="System-wide view of all event bookings and transactions."
      />

      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg">All Bookings</CardTitle>
              <CardDescription>
                {totalCount > 0 ? `Showing ${bookings.length} of ${totalCount} bookings` : "No bookings found"}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search ref, email..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val || "ALL"); setPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={orderingFilter} onValueChange={(val) => { setOrderingFilter(val || ""); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Newest First</SelectItem>
                    <SelectItem value="created_at">Oldest First</SelectItem>
                    <SelectItem value="-total_amount">Amount (High to Low)</SelectItem>
                    <SelectItem value="total_amount">Amount (Low to High)</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="date"
                  className="w-[140px]"
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                />
                {(statusFilter !== "ALL" || dateFilter !== "") && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { 
                      setStatusFilter("ALL"); 
                      setDateFilter("");
                      setPage(1); 
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-lg bg-destructive/5 border-destructive/20">
              <ShieldAlert className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive">Failed to Load Bookings</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchBookings}>
                Try Again
              </Button>
            </div>
          ) : bookings.length === 0 && !isLoading ? (
            <AdminEmptyState
              icon={TicketIcon}
              title="No Bookings Found"
              description={
                debouncedSearch || statusFilter !== "ALL" || dateFilter
                  ? "Try adjusting your search or filters."
                  : "No bookings have been made on the platform yet."
              }
              action={
                (debouncedSearch || statusFilter !== "ALL" || dateFilter)
                  ? { 
                      label: "Clear Filters", 
                      onClick: () => { 
                        setSearch(""); 
                        setStatusFilter("ALL"); 
                        setDateFilter(""); 
                      } 
                    }
                  : undefined
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={bookings}
              keyExtractor={(booking) => booking.id}
              pagination={{
                currentPage: page,
                totalCount: totalCount,
                pageSize: 10,
                hasNext: page < totalPages,
                hasPrevious: page > 1,
                onPageChange: setPage
              }}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
