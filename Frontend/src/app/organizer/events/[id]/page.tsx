"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getImageUrl } from "@/lib/image";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { useToast } from "@/hooks/use-toast";
import { EventDetail } from "@/types/event";
import { Show } from "@/types/booking";
import { EventStatusBadge } from "@/components/organizer/EventStatusBadge";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar, MapPin, Edit, Eye, Tag, AlertCircle, Clock, Trash2, Globe, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export default function EventDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const eventId = Number(params.id);
  
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [eventData, allShows] = await Promise.all([
          organizerService.getEvent(eventId) as Promise<EventDetail>,
          organizerService.getShows()
        ]);
        
        setEvent(eventData);
        setShows(allShows.filter((s: Show) => s.event === eventId));
      } catch (err: unknown) {
        console.error("Error loading event:", err);
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr?.response?.data?.detail || "Could not load the event details. It might have been deleted, or you don't have access to view it.");
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId && user) {
      fetchEventDetails();
    }
  }, [eventId, user]);

  const handleStatusChange = async (newStatus: "DRAFT" | "PUBLISHED" | "CANCELLED") => {
    try {
      setIsUpdatingStatus(true);
      const updatedEvent = await organizerService.updateEventStatus(eventId, newStatus);
      setEvent(updatedEvent as EventDetail);
      toast({
        title: "Status Updated",
        description: `Event status changed to ${newStatus}.`,
      });
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
      const axiosErr = err as { response?: { data?: { status?: string[], detail?: string } } };
      toast({
        title: "Update Failed",
        description: axiosErr?.response?.data?.status?.[0] || axiosErr?.response?.data?.detail || "An error occurred while updating the status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Access Denied or Not Found"
          message={error ?? undefined}
          actionLabel="Return to My Events"
          onAction={() => router.push("/organizer/events")}
          type="403"
        />
      </div>
    );
  }

  const isDraft = event.status === "DRAFT";
  const isCancelled = event.status === "CANCELLED";
  const isPublished = event.status === "PUBLISHED";
  const isEnded = new Date(event.end_date) <= new Date();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild aria-label="Go back">
            <Link href="/organizer/events">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              {event.title}
              <EventStatusBadge event={event} className="text-sm px-3 py-1" />
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created on {new Date(event.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {!isCancelled && (
            <Button variant="outline" asChild>
              <Link href={`/organizer/events/${event.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit Event
              </Link>
            </Button>
          )}

          {isDraft && (
            <Button 
              onClick={() => handleStatusChange("PUBLISHED")} 
              disabled={isUpdatingStatus}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
              Publish Event
            </Button>
          )}

          {isPublished && !isCancelled && !isEnded && (
            <Button 
              onClick={() => handleStatusChange("DRAFT")} 
              disabled={isUpdatingStatus}
              variant="outline"
            >
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Unpublish to Draft
            </Button>
          )}

          {!isCancelled && (
            <AlertDialog>
              <AlertDialogTrigger render={
                <Button variant="destructive" disabled={isUpdatingStatus}>
                  <Trash2 className="mr-2 h-4 w-4" /> Cancel Event
                </Button>
              } />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be fully undone. This will change the event status to CANCELLED and hide it from the public marketplace. Existing bookings may need to be refunded.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Event</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleStatusChange("CANCELLED")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Confirm Cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {isDraft && (
        <div className="bg-secondary/50 border border-secondary text-secondary-foreground rounded-lg p-4 flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">This event is a Draft.</p>
            <p className="text-sm opacity-90 mt-1">
              It is currently hidden from the public marketplace. You can safely edit all details. Once you are ready to accept bookings, click &quot;Publish Event&quot;.
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">This event is Cancelled.</p>
            <p className="text-sm opacity-90 mt-1">
              It is hidden from the public marketplace and can no longer be edited or published.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {event.event_image && (
                <div className="relative w-full h-[300px] rounded-lg overflow-hidden border">
                  <Image src={getImageUrl(event.event_image) as string} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
                </div>
              )}
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Description</h3>
                <p className="whitespace-pre-wrap">{event.description}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Start Date
                  </h3>
                  <p>{new Date(event.start_date).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> End Date
                  </h3>
                  <p>{new Date(event.end_date).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Venue
                  </h3>
                  <p>{event.venue_name || `Venue ID: ${event.venue}`}, {event.venue_city} {event.venue_state}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Tag className="h-4 w-4" /> Category & Logistics
                  </h3>
                  <p>
                    {event.category_name || `Category ID: ${event.category}`} • {event.age_limit ? `${event.age_limit}+` : "All Ages"} 
                    {event.language ? ` • ${event.language}` : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Shows Management</CardTitle>
              <CardDescription>Manage individual performance times</CardDescription>
            </CardHeader>
            <CardContent>
              {shows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center space-y-2">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No shows yet</p>
                  <p className="text-xs text-muted-foreground">Add specific showtimes for this event.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Total Shows: {shows.length}</p>
                  <ul className="space-y-2">
                    {shows.slice(0, 3).map(show => (
                      <li key={show.id} className="text-sm border-l-2 border-primary pl-2 py-1">
                        <span className="font-semibold">{new Date(show.show_date).toLocaleDateString()}</span>
                        <span className="text-muted-foreground ml-2">{show.start_time.slice(0, 5)} - {show.end_time.slice(0, 5)}</span>
                      </li>
                    ))}
                    {shows.length > 3 && (
                      <li className="text-sm text-muted-foreground italic pl-2">
                        + {shows.length - 3} more show(s)...
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/organizer/events/${event.id}/shows`}>
                  Manage Shows
                </Link>
              </Button>
              <Button className="w-full" variant="ghost" asChild>
                <Link href={`/organizer/venues/${event.venue}`}>
                  Manage Venue/Seats
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
