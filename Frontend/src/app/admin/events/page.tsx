"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { 
  CalendarDays, 
  Search, 
  Filter, 
  ShieldAlert,
  CalendarRange,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

import { adminService } from "@/services/admin.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { Badge } from "@/components/ui/badge";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/admin/DataTable";
import { Event } from "@/types/event";
import { AdminEventFilters, AdminEventListResponse } from "@/types/admin";

export default function AdminEventsPage() {
  const [data, setData] = useState<AdminEventListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [filters, setFilters] = useState<AdminEventFilters>({
    page: 1,
    search: "",
    status: undefined,
    is_active: undefined,
  });

  const fetchEvents = useCallback(async (currentFilters: AdminEventFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminService.getEvents(currentFilters);
      setData(response);
    } catch (err: unknown) {
      console.error("Failed to fetch events", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load events. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents(filters);
  }, [filters, fetchEvents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchQuery, page: 1 }));
  };

  const handleFilterChange = (key: keyof AdminEventFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value === "all" ? undefined : value, 
      page: 1 
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && data && newPage <= Math.ceil(data.count / 10)) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "DRAFT":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const columns: ColumnDef<Event>[] = useMemo(() => [
    {
      header: "Event Name",
      className: "font-medium max-w-[200px] truncate",
      cell: (event) => <span title={event.title}>{event.title}</span>,
    },
    {
      header: "Organizer",
      className: "text-muted-foreground",
      cell: (event) => `ID: ${event.organizer}`,
    },
    {
      header: "Category",
      className: "text-muted-foreground",
      cell: (event) => `ID: ${event.category}`,
    },
    {
      header: "Venue",
      className: "text-muted-foreground",
      cell: (event) => `ID: ${event.venue}`,
    },
    {
      header: "Date",
      className: "text-muted-foreground whitespace-nowrap",
      cell: (event) => format(new Date(event.start_date), "MMM d, yyyy"),
    },
    {
      header: "Status",
      cell: (event) => (
        <Badge className={`${getEventStatusColor(event.status)}`} variant="outline">
          {event.status}
        </Badge>
      ),
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (event) => (
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary" asChild>
          <Link href={`/admin/events/${event.id}`}>
            View <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      ),
    },
  ], []);

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="Event Management" 
        description="View and manage all events created across the platform."
      />

      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              Events Directory
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 md:w-auto w-full">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search titles or descriptions..."
                  className="pl-8 bg-muted/50 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value: string | null) => handleFilterChange("status", value || undefined)}
                >
                  <SelectTrigger className="w-full sm:w-[130px] bg-muted/50">
                    <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.is_active?.toString() || "all"}
                  onValueChange={(value) => {
                    const boolValue = value === "true" ? true : value === "false" ? false : undefined;
                    handleFilterChange("is_active", boolValue === undefined ? "all" : boolValue);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[120px] bg-muted/50">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.ordering || "-created_at"}
                  onValueChange={(value: string | null) => handleFilterChange("ordering", value || undefined)}
                >
                  <SelectTrigger className="w-full sm:w-[140px] bg-muted/50">
                    <SelectValue placeholder="Sort By Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-created_at">Newest First</SelectItem>
                    <SelectItem value="created_at">Oldest First</SelectItem>
                    <SelectItem value="start_date">Date (Ascending)</SelectItem>
                    <SelectItem value="-start_date">Date (Descending)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-lg bg-destructive/5 border-destructive/20">
              <ShieldAlert className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive">Failed to Load Events</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchEvents(filters)}
              >
                Try Again
              </Button>
            </div>
          ) : (!data || data.results.length === 0) && !isLoading ? (
            <AdminEmptyState
              icon={CalendarDays}
              title="No Events Found"
              description={
                filters.search || filters.status || filters.is_active !== undefined
                  ? "Try adjusting your search or filters."
                  : "No events have been created on the platform yet."
              }
              action={
                (filters.search || filters.status || filters.is_active !== undefined)
                  ? { label: "Clear Filters", onClick: () => { setSearchQuery(""); setFilters({ page: 1 }); } }
                  : undefined
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={data?.results || []}
              keyExtractor={(event) => event.id}
              pagination={{
                currentPage: filters.page || 1,
                totalCount: data?.count || 0,
                pageSize: 10,
                hasNext: !!data?.next,
                hasPrevious: !!data?.previous,
                onPageChange: handlePageChange
              }}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
