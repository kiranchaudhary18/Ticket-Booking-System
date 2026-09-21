"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Event, Venue } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import Link from "next/link";

const showSchema = z.object({
  event: z.coerce.number().min(1, "Please select an event"),
  show_date: z.string().min(1, "Show date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
}).refine(data => {
  if (!data.start_time || !data.end_time) return true;
  return data.start_time < data.end_time;
}, {
  message: "End time must be later than start time",
  path: ["end_time"],
});

type ShowFormValues = z.infer<typeof showSchema>;

export default function GlobalCreateShowPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  
  // UI State for filtering
  const [selectedVenueId, setSelectedVenueId] = useState<string>("all");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(showSchema),
    defaultValues: {
      show_date: "",
      start_time: "",
      end_time: "",
    }
  });

  const selectedEventId = watch("event");

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setIsLoading(true);
        // Fetch all venues and events for this organizer
        const [allVenues, allEvents] = await Promise.all([
          organizerService.getVenues(),
          organizerService.getEvents()
        ]);
        
        // Ensure they only see their own venues and events
        const myVenues = allVenues.filter(v => v.organizer === user.id);
        const myEvents = allEvents.filter(e => e.organizer === user.id && e.status !== "CANCELLED");
        
        setVenues(myVenues);
        setEvents(myEvents);
      } catch (err) {
        console.error("Failed to load data for show creation", err);
        setApiError("Failed to load events and venues. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [user]);

  const onSubmit = async (values: ShowFormValues) => {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      // Note: The Backend ONLY accepts 'event', 'show_date', 'start_time', 'end_time'.
      // It does NOT accept 'venue' in the payload. We strictly follow the backend schema.
      await organizerService.createShow({
        event: values.event,
        show_date: values.show_date,
        start_time: values.start_time,
        end_time: values.end_time
      });
      
      toast({
        title: "Success",
        description: "Show created successfully.",
      });
      
      // Redirect to the event's shows page
      router.push(`/organizer/events/${values.event}/shows`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> | { detail?: string } } };
      console.error("API Error:", error);
      let errorMessage = "An unexpected error occurred.";
      
      if (error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        if (data.detail && typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (typeof data === "object" && data !== null) {
          const apiErrors = Object.entries(data)
            .map(([field, msgs]) => {
              if (Array.isArray(msgs)) return msgs.join(" ");
              return `${field}: ${msgs}`;
            })
            .join(" | ");
          errorMessage = apiErrors || errorMessage;
        }
      }
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter events based on selected venue
  const filteredEvents = selectedVenueId === "all" 
    ? events 
    : events.filter(e => e.venue === Number(selectedVenueId));

  // Determine the venue for the currently selected event
  const currentEvent = events.find(e => e.id === selectedEventId);
  const currentVenue = currentEvent ? venues.find(v => v.id === currentEvent.venue) : null;

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Show</h1>
          <p className="text-muted-foreground mt-1">
            Create a new performance time for an existing event.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="p-4 rounded-md bg-destructive/15 text-destructive border border-destructive/20 font-medium">
          {apiError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Show Details</CardTitle>
          <CardDescription>
            Select an event and schedule the exact time. Only active and draft events can have shows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Optional UI Filter for Venue to make finding events easier */}
              <div className="space-y-2 md:col-span-2 p-4 bg-muted/20 border rounded-lg mb-2">
                <Label htmlFor="venue_filter" className="text-muted-foreground">Filter Events by Venue (Optional)</Label>
                <Select
                  value={selectedVenueId}
                  onValueChange={(val) => {
                    setSelectedVenueId(val as string);
                    // Reset selected event if it doesn't match the new venue filter
                    if (val !== "all" && currentEvent && currentEvent.venue !== Number(val)) {
                      setValue("event", 0); 
                    }
                  }}
                >
                  <SelectTrigger id="venue_filter" className="bg-background">
                    <SelectValue placeholder="All Venues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All My Venues</SelectItem>
                    {venues.map(v => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.name} ({v.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Selection */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="event">Select Event <span className="text-destructive">*</span></Label>
                <Select
                  value={selectedEventId ? selectedEventId.toString() : ""}
                  onValueChange={(val) => setValue("event", Number(val), { shouldValidate: true })}
                >
                  <SelectTrigger id="event" className={errors.event ? "border-destructive focus-visible:ring-destructive/50" : ""}>
                    <SelectValue placeholder="Select an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEvents.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No events found in this venue.</div>
                    ) : (
                      filteredEvents.map(e => (
                        <SelectItem key={e.id} value={e.id.toString()}>
                          {e.title} {e.status === 'DRAFT' ? '(Draft)' : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.event && <p className="text-sm text-destructive">{errors.event.message}</p>}
                
                {/* Display implicitly resolved Venue based on selected Event */}
                {currentVenue && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center">
                    This event will take place at: <span className="font-medium text-foreground ml-1">{currentVenue.name}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2 mt-2">
                <Label htmlFor="show_date">Show Date <span className="text-destructive">*</span></Label>
                <Input
                  id="show_date"
                  type="date"
                  {...register("show_date")}
                  className={errors.show_date ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.show_date && <p className="text-sm text-destructive">{errors.show_date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time <span className="text-destructive">*</span></Label>
                <Input
                  id="start_time"
                  type="time"
                  {...register("start_time")}
                  className={errors.start_time ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.start_time && <p className="text-sm text-destructive">{errors.start_time.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time <span className="text-destructive">*</span></Label>
                <Input
                  id="end_time"
                  type="time"
                  {...register("end_time")}
                  className={errors.end_time ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.end_time && <p className="text-sm text-destructive">{errors.end_time.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Show
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
