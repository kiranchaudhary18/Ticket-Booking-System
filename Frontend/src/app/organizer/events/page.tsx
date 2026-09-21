"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Event, Category, Venue } from "@/types/event";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, MapPin, Calendar, MoreVertical, Eye, Edit, ListVideo, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { EventStatusBadge } from "@/components/organizer/EventStatusBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eventService } from "@/services/event.service";
import Image from "next/image";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getImageUrl } from "@/lib/image";

export default function OrganizerEventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [allFetchedEvents, setAllFetchedEvents] = useState<Event[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  
  // Dialog state
  const [eventToCancel, setEventToCancel] = useState<number | null>(null);

  const fetchInitialData = async () => {
    try {
      setIsFetching(true);
      setError(null);
      
      const [fetchedEvents, fetchedVenues, fetchedCategories] = await Promise.all([
        organizerService.getEvents(),
        organizerService.getVenues(),
        eventService.getCategories(),
      ]);
      
      setAllFetchedEvents(fetchedEvents);
      setVenues(fetchedVenues);
      setCategories(fetchedCategories);
    } catch (err: unknown) {
      console.error("Failed to load organizer events:", err);
      setError("Failed to load your events. Please try again.");
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user]);

  useEffect(() => {
    let myEvents = [...allFetchedEvents];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      myEvents = myEvents.filter(e => e.title.toLowerCase().includes(lowerQuery) || e.description.toLowerCase().includes(lowerQuery));
    }
    
    if (categoryFilter !== "all") {
      myEvents = myEvents.filter(e => e.category === parseInt(categoryFilter));
    }
    
    if (startDate) {
      myEvents = myEvents.filter(e => e.start_date.startsWith(startDate));
    }
    
    if (statusFilter !== "all") {
      myEvents = myEvents.filter(e => {
        if (statusFilter === "ACTIVE") return e.status === "PUBLISHED" && e.is_active && new Date(e.end_date) >= new Date();
        if (statusFilter === "COMPLETED") return e.status === "PUBLISHED" && e.is_active && new Date(e.end_date) < new Date();
        if (statusFilter === "INACTIVE") return e.status === "PUBLISHED" && !e.is_active;
        return e.status === statusFilter;
      });
    }
    
    setEvents(myEvents);
  }, [searchQuery, categoryFilter, statusFilter, startDate, allFetchedEvents]);

  const handleCancelEvent = async () => {
    if (!eventToCancel) return;
    try {
      await organizerService.updateEventStatus(eventToCancel, "CANCELLED");
      toast({
        title: "Event Cancelled",
        description: "The event has been successfully cancelled.",
      });
      // Refresh list
      fetchInitialData();
    } catch (err: unknown) {
      console.error("Failed to cancel event:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast({
        title: "Action Failed",
        description: error.response?.data?.detail || "Failed to cancel the event.",
        variant: "destructive",
      });
    } finally {
      setEventToCancel(null);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState 
        type="api"
        message={error}
        onRetry={fetchInitialData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Events</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your events and shows from one place.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/events/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {isFetching && !isLoading && (
        <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium flex items-center shadow-lg animate-pulse z-50">
          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          Updating...
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 bg-muted/30 p-4 rounded-lg border">
        <div className="space-y-1">
          <Input 
            placeholder="Search events..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="space-y-1">
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: Category) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Input 
            type="date"
            placeholder="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-muted-foreground" />}
          title="No events found"
          message="You haven't created any events yet. Get started by creating your first event."
          actionLabel="Create your first event"
          onAction={() => {
            router.push("/organizer/events/create");
          }}
        />
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div className="rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Venue</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event) => {
                    const venue = venues.find(v => v.id === event.venue);
                    return (
                      <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-muted flex-shrink-0 overflow-hidden relative">
                              {event.event_image ? (
                                <Image src={getImageUrl(event.event_image) as string} alt={event.title} fill className="object-cover" sizes="40px" />
                              ) : (
                                <Calendar className="h-5 w-5 absolute inset-0 m-auto text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground line-clamp-1 max-w-[200px] sm:max-w-[300px]" title={event.title}>{event.title}</span>
                              <span className="text-xs text-muted-foreground">Category #{event.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString()} <br className="hidden sm:block" />
                          <span className="sm:hidden"> - </span>
                          {new Date(event.end_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <span className="line-clamp-1 max-w-[150px]" title={venue ? `${venue.name}, ${venue.city}` : `ID: ${event.venue}`}>
                            {venue ? venue.name : `ID: ${event.venue}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <EventStatusBadge event={event} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuItem render={<Link href={`/organizer/events/${event.id}`} className="flex items-center cursor-pointer" />}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem render={<Link href={`/organizer/events/${event.id}/edit`} className="flex items-center cursor-pointer" />}>
                                <Edit className="h-4 w-4 mr-2" /> {event.status === "DRAFT" ? "Continue Setup" : "Edit Event"}
                              </DropdownMenuItem>
                              <DropdownMenuItem render={<Link href={`/organizer/events/${event.id}/shows`} className="flex items-center cursor-pointer" />}>
                                <ListVideo className="h-4 w-4 mr-2" /> Manage Shows
                              </DropdownMenuItem>
                              {event.status !== "CANCELLED" && (
                                <DropdownMenuItem onClick={() => setEventToCancel(event.id)} className="flex items-center cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                  <XCircle className="h-4 w-4 mr-2" /> Cancel Event
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={eventToCancel !== null} onOpenChange={(open) => !open && setEventToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this event? This action cannot be fully undone and will hide the event from the public marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelEvent} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
