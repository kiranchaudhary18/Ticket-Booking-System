"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { getImageUrl } from "@/lib/image";
import { 
  ArrowLeft, 
  Loader2, 
  ShieldAlert,
  CalendarDays,
  MapPin,
  Users,
  Tag,
  CheckCircle2,
  XCircle,
  Save,
  Clock,
  Ticket as TicketIcon
} from "lucide-react";

import { adminService } from "@/services/admin.service";
import { Event, EventStatus } from "@/types/event";
import { AdminTicketReport } from "@/types/admin";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminEventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketReport, setTicketReport] = useState<AdminTicketReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [status, setStatus] = useState<EventStatus>("DRAFT");
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [eventData, reportData] = await Promise.all([
          adminService.getEventDetail(eventId),
          adminService.getTicketReport({ event: eventId }).catch(() => null) // Optional, so catch error
        ]);
        
        setEvent(eventData);
        setTicketReport(reportData);
        
        setStatus(eventData.status);
      } catch (err: unknown) {
        console.error("Failed to fetch event details", err);
        const error = err as { message?: string };
        setError(error.message || "Failed to load event information.");
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  const handleSaveClick = () => {
    if (!event) return;
    
    // Check if we are doing a sensitive change (like cancelling)
    if (event.status !== "CANCELLED" && status === "CANCELLED") {
      setShowConfirmDialog(true);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    try {
      setShowConfirmDialog(false);
      setIsSaving(true);
      const updatedData = await adminService.updateEventStatus(eventId, {
        status
      });
      setEvent(updatedData);
      toast.success("Event updated successfully");
    } catch (err: unknown) {
      console.error("Failed to update event", err);
      const error = err as { message?: string };
      toast.error(error.message || "Failed to update event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getEventStatusColor = (statusStr: string) => {
    switch (statusStr) {
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

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Event Not Found"
          message={error || "The event you are looking for does not exist or you don't have permission to view it."}
          actionLabel="Back to Events List"
          onAction={() => router.push("/admin/events")}
        />
      </div>
    );
  }

  const hasChanges = event.status !== status;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-10">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push("/admin/events")}
          className="h-9 w-9"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Details</h1>
          <p className="text-sm text-muted-foreground">
            View and manage {event.title}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Event Info */}
        <Card className="md:col-span-2 shadow-sm border">
          <CardHeader className="pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(event.start_date), "MMM d, yyyy")} - {format(new Date(event.end_date), "MMM d, yyyy")}
                </CardDescription>
              </div>
              <Badge className={`${getEventStatusColor(event.status)}`}>
                {event.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {event.event_image && (
              <div className="w-full h-48 relative rounded-md overflow-hidden bg-muted">
                <Image 
                  src={getImageUrl(event.event_image) as string} 
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
            )}
            
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" /> Organizer ID
                </span>
                <p className="text-sm font-medium">{event.organizer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> Venue ID
                </span>
                <p className="text-sm font-medium">{event.venue}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" /> Category ID
                </span>
                <p className="text-sm font-medium">{event.category}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> Age Limit
                </span>
                <p className="text-sm font-medium">{event.age_limit ? `${event.age_limit}+` : "None"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Actions & Stats */}
        <div className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-lg">Admin Actions</CardTitle>
              <CardDescription>Update visibility and state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Event Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val as EventStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button 
                onClick={handleSaveClick} 
                disabled={!hasChanges || isSaving}
                className="gap-2 w-full"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          {ticketReport && (
            <Card className="shadow-sm border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-primary" />
                  Booking Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Tickets</span>
                  <span className="font-bold">{ticketReport.total_tickets}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{ticketReport.active_tickets}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Used</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{ticketReport.used_tickets}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Cancelled</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{ticketReport.cancelled_tickets}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Actions */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Event Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {event.status !== "CANCELLED" && status === "CANCELLED" && (
                <span className="block mb-2 text-destructive font-medium">
                  Warning: You are cancelling this event. This is a highly destructive action and may affect existing bookings.
                </span>
              )}
              Are you sure you want to proceed with these changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
