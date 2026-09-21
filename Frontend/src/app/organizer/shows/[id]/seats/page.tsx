"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Event } from "@/types/event";
import { Show, SeatAvailability } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertCircle, LayoutGrid, Armchair, List, Grid3X3, Map } from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ShowSeatsPage() {
  const params = useParams();
  const router = useRouter();
  const showId = Number(params.id);
  
  const { user } = useAuth();
  
  const [show, setShow] = useState<Show | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<SeatAvailability[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering & View state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"MAP" | "TABLE">("MAP");

  useEffect(() => {
    async function fetchData() {
      if (!user || isNaN(showId)) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const showData = await organizerService.getShow(showId);
        setShow(showData);
        
        const eventData = await organizerService.getEventDetails(showData.event);
        if (eventData.organizer !== user.id) {
          setError("You do not have permission to view this show's seats.");
          setIsLoading(false);
          return;
        }
        setEvent(eventData);
        
        const seatsData = await organizerService.getShowAvailableSeats(showId);
        
        const sortedSeats = seatsData.sort((a, b) => {
          if (a.row === b.row) {
            const numA = parseInt(a.seat_number);
            const numB = parseInt(b.seat_number);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.seat_number.localeCompare(b.seat_number);
          }
          return a.row.localeCompare(b.row);
        });
        
        setSeats(sortedSeats);
      } catch (err: unknown) {
        console.error("Error loading show seats:", err);
        setError("Failed to load seat information. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [user, showId]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !show || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Access Denied"
          message={error || "Could not load seating data."}
          actionLabel="Go Back"
          onAction={() => router.back()}
          type="403"
        />
      </div>
    );
  }

  const filteredSeats = seats.filter(seat => {
    const matchesSearch = 
      seat.row.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seat.seat_number.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = filterStatus === "ALL" || seat.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const availableCount = seats.filter(s => s.status === "AVAILABLE").length;
  const bookedCount = seats.filter(s => s.status === "BOOKED").length;
  const lockedCount = seats.filter(s => s.status === "LOCKED").length;

  // Group seats by row for the visual map
  const rows = Array.from(new Set(filteredSeats.map(s => s.row))).sort();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Seat Management</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {event.title} • {format(new Date(show.show_date), "MMM d, yyyy")} • {show.start_time.substring(0, 5)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center bg-muted/50 p-1 rounded-md border">
          <Button 
            variant={viewMode === "MAP" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("MAP")}
            className="flex items-center gap-2"
          >
            <Map className="h-4 w-4" />
            Visual Map
          </Button>
          <Button 
            variant={viewMode === "TABLE" ? "secondary" : "ghost"} 
            size="sm" 
            onClick={() => setViewMode("TABLE")}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            List View
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Seats</CardDescription>
            <CardTitle className="text-2xl">{seats.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">{availableCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Booked</CardDescription>
            <CardTitle className="text-2xl text-primary">{bookedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Locked (In Cart)</CardDescription>
            <CardTitle className="text-2xl text-orange-500">{lockedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Seat Directory</span>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              <LayoutGrid className="mr-1 h-3 w-3" />
              Venue Configured
            </Badge>
          </CardTitle>
          <CardDescription>
            View the real-time availability status of all seats for this show.
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input 
              placeholder="Search by row or seat number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={filterStatus === "ALL" ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilterStatus("ALL")}
              >
                All
              </Button>
              <Button 
                variant={filterStatus === "AVAILABLE" ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilterStatus("AVAILABLE")}
              >
                Available
              </Button>
              <Button 
                variant={filterStatus === "BOOKED" ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilterStatus("BOOKED")}
              >
                Booked
              </Button>
            </div>
          </div>

          {seats.length === 0 ? (
            <EmptyState
              icon={<Armchair className="h-12 w-12 text-muted-foreground" />}
              title="No Seats Configured"
              message="This venue doesn't have any physical seats configured yet. Go to Venue Management to set up seating."
              className="min-h-[300px] border-none shadow-none bg-muted/5"
            />
          ) : filteredSeats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No seats match your current filters.
            </div>
          ) : viewMode === "TABLE" ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Seat Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeats.map((seat) => (
                    <TableRow key={seat.id}>
                      <TableCell className="font-medium">{seat.row}</TableCell>
                      <TableCell>{seat.seat_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          seat.seat_type === "VIP" ? "border-amber-500 text-amber-600" :
                          seat.seat_type === "PREMIUM" ? "border-purple-500 text-purple-600" :
                          "border-blue-500 text-blue-600"
                        }>
                          {seat.seat_type}
                        </Badge>
                      </TableCell>
                      <TableCell>${parseFloat(seat.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {seat.status === "AVAILABLE" && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Available</Badge>
                        )}
                        {seat.status === "BOOKED" && (
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-none">Booked</Badge>
                        )}
                        {seat.status === "LOCKED" && (
                          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-none">Locked</Badge>
                        )}
                        {seat.status === "UNAVAILABLE" && (
                          <Badge variant="secondary">Unavailable</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Visual Map View */
            <div className="border rounded-xl bg-muted/10 p-6 overflow-x-auto">
              <div className="min-w-max flex flex-col items-center gap-8">
                
                {/* Stage Indicator */}
                <div className="w-2/3 max-w-2xl h-12 bg-muted-foreground/20 rounded-t-full border-2 border-b-0 border-muted-foreground/30 flex items-center justify-center mx-auto mb-8 shadow-sm">
                  <span className="text-muted-foreground font-semibold tracking-[0.3em] uppercase text-sm">STAGE</span>
                </div>

                <div className="space-y-6">
                  {rows.map(row => (
                    <div key={row} className="flex items-center gap-6 justify-center">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm">
                        {row}
                      </div>
                      
                      <div className="flex gap-2">
                        {filteredSeats.filter(s => s.row === row).map(seat => {
                          let bgColor = "bg-green-100 hover:bg-green-200 border-green-300 text-green-900"; // AVAILABLE
                          if (seat.status === "BOOKED") bgColor = "bg-primary/80 text-primary-foreground border-primary";
                          if (seat.status === "LOCKED") bgColor = "bg-orange-400 text-white border-orange-500";
                          if (seat.status === "UNAVAILABLE") bgColor = "bg-muted text-muted-foreground border-border opacity-50";

                          let badgeColor = "bg-blue-500";
                          if (seat.seat_type === "VIP") badgeColor = "bg-amber-500";
                          if (seat.seat_type === "PREMIUM") badgeColor = "bg-purple-500";
                          
                          return (
                            <TooltipProvider key={seat.id}>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={`relative w-10 h-10 rounded-md border flex items-center justify-center cursor-default transition-all shadow-sm ${bgColor}`}>
                                    <span className="text-xs font-bold">{seat.seat_number}</span>
                                    {/* Seat Type Indicator Dot */}
                                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white shadow-sm ${badgeColor}`} />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="flex flex-col gap-1 text-sm p-3 border shadow-md">
                                  <div className="font-bold border-b pb-1 mb-1 flex justify-between gap-4">
                                    <span>Row {seat.row} - Seat {seat.seat_number}</span>
                                    <span className="text-muted-foreground">${parseFloat(seat.price).toFixed(2)}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Type:</span>
                                    <Badge variant="outline" className="h-5 text-[10px] uppercase">
                                      {seat.seat_type}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium capitalize">{seat.status.toLowerCase()}</span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                      
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0 border shadow-sm">
                        {row}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-12 p-4 border rounded-lg bg-background shadow-sm w-full max-w-3xl">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-green-100 border border-green-300" />
                    <span className="text-sm">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-primary/80 border border-primary" />
                    <span className="text-sm">Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-orange-400 border border-orange-500" />
                    <span className="text-sm">In Cart</span>
                  </div>
                  <div className="h-4 w-px bg-border mx-2" />
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500 border border-white shadow-sm" />
                    <span className="text-sm text-muted-foreground">Regular</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500 border border-white shadow-sm" />
                    <span className="text-sm text-muted-foreground">Premium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm" />
                    <span className="text-sm text-muted-foreground">VIP</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
