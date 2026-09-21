"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Ticket as TicketIcon, 
  XCircle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  DollarSign,
  Loader2,
  BookmarkIcon,
  CalendarDays,
  Filter
} from "lucide-react";
import dynamic from "next/dynamic";
const AdminMonthlyRevenueChart = dynamic(() => import("@/components/admin/charts/AdminMonthlyRevenueChart").then(mod => mod.AdminMonthlyRevenueChart), { ssr: false });
const AdminEventRevenueChart = dynamic(() => import("@/components/admin/charts/AdminEventRevenueChart").then(mod => mod.AdminEventRevenueChart), { ssr: false });
const AdminTicketStatusChart = dynamic(() => import("@/components/admin/charts/AdminTicketStatusChart").then(mod => mod.AdminTicketStatusChart), { ssr: false });
const AdminPaymentStatusChart = dynamic(() => import("@/components/admin/charts/AdminPaymentStatusChart").then(mod => mod.AdminPaymentStatusChart), { ssr: false });
const AdminBookingStatusChart = dynamic(() => import("@/components/admin/charts/AdminBookingStatusChart").then(mod => mod.AdminBookingStatusChart), { ssr: false });

import { adminService } from "@/services/admin.service";
import { AdminRevenueReport, AdminTicketReport, AdminDashboardStatistics } from "@/types/admin";

import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { DataTable, ColumnDef } from "@/components/admin/DataTable";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminReportsPage() {
  const [revenueReport, setRevenueReport] = useState<AdminRevenueReport | null>(null);
  const [ticketReport, setTicketReport] = useState<AdminTicketReport | null>(null);
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStatistics | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [eventId, setEventId] = useState("");
  
  // Reference for event dropdown (we keep a full list)
  const [availableEvents, setAvailableEvents] = useState<Array<{id: number, title: string}>>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const revenueParams: Record<string, string> = {};
        if (startDate) revenueParams.start_date = startDate;
        if (endDate) revenueParams.end_date = endDate;
        if (paymentStatus !== "ALL") revenueParams.status = paymentStatus;

        const ticketParams: Record<string, string> = {};
        if (eventId && eventId !== "ALL") ticketParams.event = String(eventId);

        const [revenueData, ticketData, statsData] = await Promise.all([
          adminService.getRevenueReport(revenueParams),
          adminService.getTicketReport(ticketParams),
          adminService.getDashboardStatistics()
        ]);
        
        setRevenueReport(revenueData);
        setTicketReport(ticketData);
        setDashboardStats(statsData);
        
        // Populate events dropdown on first load only if empty
        if (availableEvents.length === 0 && revenueData.by_event) {
          setAvailableEvents(revenueData.by_event.map(e => ({ id: e.event_id, title: e.event_title })));
        }
      } catch (err: unknown) {
        console.error("Failed to fetch reports:", err);
        const error = err as { message?: string };
        setError(error.message || "Failed to load reports data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [startDate, endDate, paymentStatus, eventId]);

  // Frontend filtering for Event-wise revenue (since revenue backend API doesn't support ?event=)
  const filteredEventRevenue = useMemo(() => {
    if (!revenueReport?.by_event) return [];
    if (eventId && eventId !== "ALL") {
      return revenueReport.by_event.filter(e => e.event_id === Number(eventId));
    }
    return revenueReport.by_event;
  }, [revenueReport, eventId]);

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    {
      header: "Event Name",
      accessorKey: "event_title",
      className: "font-medium text-primary",
    },
    {
      header: "Tickets Sold",
      accessorKey: "tickets_sold",
      headerClassName: "text-right",
      className: "text-right",
    },
    {
      header: "Revenue Generated",
      headerClassName: "text-right",
      className: "text-right font-bold text-green-600 dark:text-green-500",
      cell: (event) => `₹${Number(event.revenue || 0).toLocaleString()}`,
    }
  ], []);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChartIcon className="h-8 w-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Loading comprehensive reports...</p>
        </div>
        <AdminLoadingState type="kpi" />
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <AdminLoadingState type="chart" />
          <AdminLoadingState type="chart" />
        </div>
      </div>
    );
  }

  if (error || !revenueReport || !ticketReport || !dashboardStats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Failed to Load Reports"
          message={error || "Could not retrieve the requested statistics."}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="Reports & Analytics" 
        description="Detailed analytics and reports for platform revenue and ticket sales."
      />

      {/* Filters */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Date Range (Revenue)</label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="bg-background"
                />
                <span className="self-center text-muted-foreground">-</span>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-background"
                />
              </div>
            </div>
            
            <div className="space-y-1.5 w-full md:w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Event Filter</label>
              <Select value={eventId || "ALL"} onValueChange={(val) => setEventId(val || "")}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Events</SelectItem>
                  {availableEvents.map(evt => (
                    <SelectItem key={evt.id} value={evt.id.toString()}>{evt.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
              <Select value={paymentStatus} onValueChange={(val) => setPaymentStatus(val || "")}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(startDate || endDate || paymentStatus !== "ALL" || (eventId && eventId !== "ALL")) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPaymentStatus("ALL");
                  setEventId("ALL");
                }}
                className="mb-[1px]"
              >
                Clear
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Filters apply dynamically to supported metrics only. Booking/Event summaries are all-time.
          </p>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{revenueReport.total_revenue}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {revenueReport.successful_payments} successful payments
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booking Summary
            </CardTitle>
            <BookmarkIcon className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.overview.bookings}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {dashboardStats.bookings.confirmed} Confirmed Bookings
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Event Summary
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.overview.events}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              Platform Hosted Events
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tickets Sold
            </CardTitle>
            <TicketIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketReport.total_tickets}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              Across all platform events
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active / Used Tickets
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ticketReport.active_tickets} / {ticketReport.used_tickets}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valid vs checked-in
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled Tickets
            </CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{ticketReport.cancelled_tickets}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Refunds processed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AdminMonthlyRevenueChart data={revenueReport.by_month} />
        <AdminEventRevenueChart data={filteredEventRevenue} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AdminTicketStatusChart data={ticketReport} />
        <AdminBookingStatusChart data={dashboardStats} />
        <AdminPaymentStatusChart data={revenueReport} />
      </div>
      
      {/* Table view for more detailed data */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Event Performance Breakdown</CardTitle>
          <CardDescription>
            Detailed ticketing and revenue statistics per event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEventRevenue && filteredEventRevenue.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredEventRevenue}
              keyExtractor={(event) => event.event_id}
            />
          ) : (
            <EmptyState
              icon={<BarChartIcon className="h-12 w-12 text-muted-foreground" />}
              title="No event records found"
              message="There are no detailed event records available for the selected filters."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
