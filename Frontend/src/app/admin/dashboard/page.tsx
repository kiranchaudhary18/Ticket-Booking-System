"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  CreditCard,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

import { adminService } from "@/services/admin.service";
import { AdminDashboardStatistics, AdminBookingListResponse, AdminEventListResponse } from "@/types/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import dynamic from "next/dynamic";
const AdminRevenueOverview = dynamic(() => import("@/components/admin/AdminRevenueOverview").then(mod => mod.AdminRevenueOverview), { ssr: false });
import { AdminBookingOverview } from "@/components/admin/AdminBookingOverview";
import { AdminEventOverview } from "@/components/admin/AdminEventOverview";
import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStatistics | null>(null);
  const [recentBookings, setRecentBookings] = useState<AdminBookingListResponse | null>(null);
  
  const [recentEvents, setRecentEvents] = useState<AdminEventListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [statsData, bookingsData, eventsData] = await Promise.all([
        adminService.getDashboardStatistics(),
        adminService.getBookings({ page: 1 }),
        adminService.getEvents({ page: 1, ordering: "-created_at" })
      ]);
      
      setStats(statsData);
      setRecentBookings(bookingsData);
      setRecentEvents(eventsData);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || "An unexpected error occurred while loading dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "SUCCESS":
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "PENDING":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "CANCELLED":
      case "REFUNDED":
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "USED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto w-full pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Loading system metrics...</p>
        </div>
        <AdminLoadingState type="kpi" />
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          <AdminLoadingState type="chart" />
          <AdminLoadingState type="chart" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Error Loading Dashboard"
          message={error ?? undefined}
          actionLabel="Try Again"
          onAction={() => fetchDashboardData()}
        />
      </div>
    );
  }

  const refreshAction = (
    <Button
      onClick={fetchDashboardData}
      variant="outline"
      className="bg-white"
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Refresh
    </Button>
  );

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="Dashboard Overview" 
        description="Monitor platform activity, bookings, revenue and events."
        action={refreshAction}
      />

      {/* Reusable Admin Statistics Cards */}
      <AdminStatsCards stats={stats} />

      <div className="grid gap-6">
        {/* Revenue Overview Chart */}
        <AdminRevenueOverview stats={stats} />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Booking Overview */}
          <AdminBookingOverview stats={stats} recentBookings={recentBookings} />
          
          {/* Event Overview */}
          <AdminEventOverview stats={stats} recentEvents={recentEvents} />
        </div>
      </div>
    </div>
  );
}
