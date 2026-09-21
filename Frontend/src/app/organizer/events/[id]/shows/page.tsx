"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Event } from "@/types/event";
import { Show } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, PlusCircle, CalendarDays, Clock, Edit, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const showSchema = z.object({
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

export default function EventShowsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentEditShow, setCurrentEditShow] = useState<Show | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { errors: createErrors }
  } = useForm<ShowFormValues>({
    resolver: zodResolver(showSchema),
    defaultValues: {
      show_date: "",
      start_time: "",
      end_time: "",
    }
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isDirty }
  } = useForm<ShowFormValues>({
    resolver: zodResolver(showSchema),
  });

  const fetchShowsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const eventData = await organizerService.getEventDetails(eventId);
      setEvent(eventData);
      
      const showsData = await organizerService.getShows(eventId);
      
      // Sort shows by date and time
      const sortedShows = showsData.sort((a, b) => {
        const dateA = new Date(`${a.show_date}T${a.start_time}`);
        const dateB = new Date(`${b.show_date}T${b.start_time}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      setShows(sortedShows);
    } catch (err: unknown) {
      console.error("Failed to load shows:", err);
      setError("Failed to load event shows. Make sure you own this event.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isNaN(eventId)) {
      Promise.resolve().then(() => fetchShowsData());
    }
  }, [user, eventId]);

  const onCreateSubmit = async (values: ShowFormValues) => {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      await organizerService.createShow({
        ...values,
        event: eventId
      });
      
      toast({
        title: "Success",
        description: "Show created successfully.",
      });
      
      setIsCreateOpen(false);
      resetCreate();
      fetchShowsData(); // Refresh list
    } catch (error: unknown) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (show: Show) => {
    setCurrentEditShow(show);
    resetEdit({
      show_date: show.show_date,
      start_time: show.start_time.substring(0, 5), // Format HH:mm
      end_time: show.end_time.substring(0, 5),
    });
    setApiError(null);
    setIsEditOpen(true);
  };

  const onEditSubmit = async (values: ShowFormValues) => {
    if (!currentEditShow) return;
    
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      await organizerService.updateShow(currentEditShow.id, {
        ...values,
      });
      
      toast({
        title: "Success",
        description: "Show updated successfully.",
      });
      
      setIsEditOpen(false);
      fetchShowsData();
    } catch (error: unknown) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShow = async (showId: number) => {
    try {
      // It's a soft delete in the backend (sets is_active to False)
      await organizerService.deleteShow(showId);
      
      toast({
        title: "Success",
        description: "Show has been cancelled.",
      });
      
      fetchShowsData();
    } catch (error: unknown) {
      console.error("Failed to cancel show:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not cancel the show. It might have existing bookings.",
      });
    }
  };

  const handleApiError = (error: any) => {
    console.error("API Error:", error);
    let errorMessage = "An unexpected error occurred.";
    
    if (error.response?.data) {
      if (typeof error.response.data === "object") {
        const errors = Object.entries(error.response.data)
          .map(([field, msgs]) => {
            if (Array.isArray(msgs)) return msgs.join(" ");
            return `${field}: ${msgs}`;
          })
          .join(" | ");
        errorMessage = errors || errorMessage;
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      }
    }
    setApiError(errorMessage);
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Something went wrong"
          message={error ?? undefined}
          actionLabel="Try Again"
          onAction={fetchShowsData}
        />
      </div>
    );
  }

  const isEventEditable = event.status !== "CANCELLED" && event.is_active;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Go back">
            <Link href={`/organizer/events/${eventId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shows</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {event.title}
              <Badge variant={event.is_active ? "default" : "secondary"} className="h-5">
                {event.status}
              </Badge>
            </p>
          </div>
        </div>

        {isEventEditable && (
          <>
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Show
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) { setApiError(null); resetCreate(); }
            }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Show</DialogTitle>
                  <DialogDescription>
                    Schedule a new performance time for this event.
                  </DialogDescription>
                </DialogHeader>
                
                {apiError && (
                  <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20">
                    {apiError}
                  </div>
                )}
                
                <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-date">Show Date</Label>
                    <Input id="create-date" type="date" {...registerCreate("show_date")} />
                    {createErrors.show_date && <p className="text-xs text-destructive">{createErrors.show_date.message}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-start">Start Time</Label>
                      <Input id="create-start" type="time" {...registerCreate("start_time")} />
                      {createErrors.start_time && <p className="text-xs text-destructive">{createErrors.start_time.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-end">End Time</Label>
                      <Input id="create-end" type="time" {...registerCreate("end_time")} />
                      {createErrors.end_time && <p className="text-xs text-destructive">{createErrors.end_time.message}</p>}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Show
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {!isEventEditable && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Event is Cancelled or Inactive.</p>
            <p className="text-sm opacity-90 mt-1">
              You cannot add or modify shows for an event that is cancelled or inactive.
            </p>
          </div>
        </div>
      )}

      {shows.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12 text-muted-foreground" />}
          title="No shows scheduled"
          message="You haven't scheduled any performance times for this event yet. Add a show to allow customers to book tickets."
          actionLabel={isEventEditable ? "Add First Show" : undefined}
          onAction={isEventEditable ? () => setIsCreateOpen(true) : undefined}
        />
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div className="rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Timing</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shows.map((show) => {
                    const isCancelled = !show.is_active;
                    return (
                      <tr key={show.id} className={`transition-colors ${isCancelled ? 'opacity-70 bg-muted/30' : 'hover:bg-muted/30'}`}>
                        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(show.show_date), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {show.start_time.substring(0, 5)} - {show.end_time.substring(0, 5)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(show.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {show.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEventEditable && show.is_active && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(show)} className="h-8">
                                  <Edit className="h-4 w-4 mr-1.5" /> Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to cancel the show on ${format(new Date(show.show_date), "MMM d, yyyy")} at ${show.start_time.substring(0, 5)}? This will deactivate the show and hide it from customers.`)) {
                                      handleDeleteShow(show.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-1.5" /> Cancel
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Edit Show Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) { setApiError(null); resetEdit(); setCurrentEditShow(null); }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Show</DialogTitle>
            <DialogDescription>
              Update the schedule for this performance.
            </DialogDescription>
          </DialogHeader>
          
          {apiError && (
            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20">
              {apiError}
            </div>
          )}
          
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Show Date</Label>
              <Input id="edit-date" type="date" {...registerEdit("show_date")} />
              {editErrors.show_date && <p className="text-xs text-destructive">{editErrors.show_date.message}</p>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Time</Label>
                <Input id="edit-start" type="time" {...registerEdit("start_time")} />
                {editErrors.start_time && <p className="text-xs text-destructive">{editErrors.start_time.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Time</Label>
                <Input id="edit-end" type="time" {...registerEdit("end_time")} />
                {editErrors.end_time && <p className="text-xs text-destructive">{editErrors.end_time.message}</p>}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
