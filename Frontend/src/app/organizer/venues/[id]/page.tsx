"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Venue, Event } from "@/types/event";
import { Show, Seat } from "@/types/booking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Users, CalendarDays, Edit, Grid } from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import Link from "next/link";
import { format } from "date-fns";

export default function VenueDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = Number(params.id);
  const { user } = useAuth();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user || isNaN(venueId)) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch all required data concurrently
        const [allVenues, allEvents, allShows, venueSeats] = await Promise.all([
          organizerService.getVenues(),
          organizerService.getEvents(),
          organizerService.getShows(),
          organizerService.getSeats(venueId),
        ]);
        
        // Find the specific venue
        const currentVenue = allVenues.find(v => v.id === venueId && v.organizer === user.id);
        
        if (!currentVenue) {
          setError("Venue not found or you do not have permission to view it.");
          setIsLoading(false);
          return;
        }
        
        setVenue(currentVenue);
        
        // Find events associated with this venue
        const venueEvents = allEvents.filter(e => e.venue === venueId);
        setEvents(venueEvents);
        
        // Find shows associated with these events
        const venueEventIds = new Set(venueEvents.map(e => e.id));
        const venueShows = allShows.filter(s => venueEventIds.has(s.event));
        setShows(venueShows);
        
        // Set seats
        setSeats(venueSeats);
        
      } catch (err: unknown) {
        console.error("Failed to load venue details:", err);
        setError("An error occurred while loading the venue details.");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [user, venueId]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Venue Not Found"
          message={error || "The venue could not be found."}
          actionLabel="Back to Venues"
          onAction={() => router.push("/organizer/venues")}
        />
      </div>
    );
  }

  const getEventTitle = (eventId: number) => {
    return events.find(e => e.id === eventId)?.title || `Event #${eventId}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Go back">
          <Link href="/organizer/venues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{venue.name}</h1>
            <Badge variant={venue.is_active ? "default" : "destructive"}>
              {venue.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">{venue.venue_type}</Badge>
          </div>
          <div className="flex items-center text-muted-foreground mt-2 gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {venue.city}, {venue.state}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Capacity: {venue.capacity}
            </span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/organizer/venues/${venue.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Venue
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Venue Details */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                <p className="text-sm">{venue.address}</p>
                <p className="text-sm">{venue.city}, {venue.state} - {venue.pincode}</p>
              </div>
              {venue.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm whitespace-pre-line">{venue.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Events Hosted</span>
                <span className="font-semibold">{events.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Shows</span>
                <span className="font-semibold">{shows.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seats Configured</span>
                <span className="font-semibold">{seats.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tabs for Shows and Seats */}
        <div className="md:col-span-2">
          <Tabs defaultValue="shows" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shows">
                <CalendarDays className="h-4 w-4 mr-2" />
                Shows
              </TabsTrigger>
              <TabsTrigger value="seats">
                <Grid className="h-4 w-4 mr-2" />
                Seat Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shows" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Shows at this Venue</h3>
              </div>
              
              {shows.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-12 w-12 text-muted-foreground" />}
                  title="No shows scheduled"
                  message="No shows have been scheduled at this venue yet. To add a show, first create an event for this venue."
                  className="min-h-[250px] p-6"
                />
              ) : (
                <div className="grid gap-4">
                  {shows.map((show) => (
                    <Card key={show.id}>
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{getEventTitle(show.event)}</h4>
                            <Badge variant={show.is_active ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0 h-4">
                              {show.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {format(new Date(show.show_date), "MMM d, yyyy")}
                            </span>
                            <span>
                              {show.start_time.substring(0, 5)} - {show.end_time.substring(0, 5)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="seats" className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Seat Configuration</h3>
                  <p className="text-sm text-muted-foreground">Manage physical seat layouts for this venue</p>
                </div>
              </div>
              
              {seats.length === 0 ? (
                <EmptyState
                  icon={<Grid className="h-12 w-12 text-muted-foreground" />}
                  title="No seats configured"
                  message="You haven't added any specific seats to this venue."
                  actionLabel="Manage Seats"
                  onAction={() => {
                    router.push(`/organizer/venues/${venue.id}/seats`);
                  }}
                  className="min-h-[250px] p-6"
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Seats Configured: {seats.length}</span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/organizer/venues/${venue.id}/seats`}>
                        Manage Seats
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Row</th>
                          <th className="px-4 py-3 font-medium">Seat Type</th>
                          <th className="px-4 py-3 font-medium text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* Group seats by row and type for summary display */}
                        {Array.from(new Set(seats.map(s => s.row))).sort().map(row => {
                          const rowSeats = seats.filter(s => s.row === row);
                          const types = Array.from(new Set(rowSeats.map(s => s.seat_type)));
                          
                          return types.map(type => {
                            const count = rowSeats.filter(s => s.seat_type === type).length;
                            return (
                              <tr key={`${row}-${type}`} className="bg-card hover:bg-muted/50">
                                <td className="px-4 py-3 font-medium">Row {row}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline">{type}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right">{count}</td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
