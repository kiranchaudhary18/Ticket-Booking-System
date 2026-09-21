"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, IndianRupee, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api-client";

interface RevenueStats {
  total_revenue: number;
  recent_revenue?: Record<string, unknown>[];
  event_revenue?: Record<string, unknown>[];
}

export function OrganizerRevenueOverview() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueStats | null>(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // The only backend endpoint that provides statistics (including revenue) is the Admin endpoint.
        // We do not invent frontend calculations or fake endpoints per the constraints.
        // This will return 403 Forbidden for the ORGANIZER role.
        const response = await apiClient.get("/api/events/admin/statistics/");
        setRevenueData(response.data);
      } catch (err: unknown) {
        console.error("Failed to fetch revenue data", err);
        const axiosErr = err as { response?: { status?: number } };
        setError(axiosErr?.response?.status === 403 
          ? "Revenue data is restricted to Administrators in the current API."
          : "Failed to load revenue overview.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchRevenue();
    }
  }, [user]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Financial summary for your events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[150px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading revenue data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border-destructive/20">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Financial summary for your events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[150px] text-center border-dashed border-2 rounded-lg m-2 border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive mb-1">Access Restricted</p>
          <p className="text-xs text-muted-foreground max-w-[300px]">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Fallback if data somehow loads but doesn't exist (e.g. if permissions change in future)
  if (!revenueData) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Financial summary for your events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[150px] text-center border-dashed border-2 rounded-lg m-2">
          <IndianRupee className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">No revenue data available.</p>
        </CardContent>
      </Card>
    );
  }

  // If backend permissions are ever updated to allow organizers, this will safely render it
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>Financial summary for your events.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 border-b pb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <IndianRupee className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <h3 className="text-3xl font-bold tracking-tight">₹{revenueData.total_revenue || "0.00"}</h3>
          </div>
        </div>
        <div className="pt-4 text-sm text-muted-foreground">
          Detailed revenue splits and event-wise data are not currently available in this payload.
        </div>
      </CardContent>
    </Card>
  );
}
