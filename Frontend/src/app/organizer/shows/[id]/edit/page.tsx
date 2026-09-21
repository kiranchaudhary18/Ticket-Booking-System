"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";

const showSchema = z.object({
  show_date: z.string().min(1, "Show date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  is_active: z.boolean().default(true),
}).refine(data => {
  if (!data.start_time || !data.end_time) return true;
  return data.start_time < data.end_time;
}, {
  message: "End time must be later than start time",
  path: ["end_time"],
});

export default function EditShowPage() {
  const router = useRouter();
  const params = useParams();
  const showId = Number(params.id);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [show, setShow] = useState<Show | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm({
    resolver: zodResolver(showSchema),
    defaultValues: {
      show_date: "",
      start_time: "",
      end_time: "",
      is_active: true,
    }
  });

  const isActive = watch("is_active");

  useEffect(() => {
    async function fetchShowData() {
      if (!user || isNaN(showId)) return;
      
      try {
        setIsPageLoading(true);
        setPageError(null);
        
        // Use getShow to get the specific show
        const showData = await organizerService.getShow(showId);
        
        // Then fetch the associated event to check ownership and display details
        const eventData = await organizerService.getEventDetails(showData.event);
        
        if (eventData.organizer !== user.id) {
          setPageError("You do not have permission to edit this show.");
          setIsPageLoading(false);
          return;
        }

        setShow(showData);
        setEvent(eventData);

        // Pre-fill the form
        reset({
          show_date: showData.show_date,
          start_time: showData.start_time.substring(0, 5), // Format HH:mm
          end_time: showData.end_time.substring(0, 5),
          is_active: showData.is_active,
        });

      } catch (err: unknown) {
        console.error("Error loading show:", err);
        setPageError("The show could not be found or you don't have permission.");
      } finally {
        setIsPageLoading(false);
      }
    }
    
    fetchShowData();
  }, [user, showId, reset]);

  const onSubmit = async (values: z.infer<typeof showSchema>) => {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      // Backend expects: show_date, start_time, end_time, is_active
      await organizerService.updateShow(showId, values);
      
      toast({
        title: "Success",
        description: "Show updated successfully.",
      });
      
      // Navigate back to the event's shows management page
      if (show) {
        router.push(`/organizer/events/${show.event}/shows`);
      } else {
        router.back();
      }
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

  if (isPageLoading) {
    return <PageSkeleton />;
  }

  if (pageError || !show) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 max-w-md mx-auto text-center">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
        <p className="text-muted-foreground">{pageError || "Show could not be loaded."}</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const isEventEditable = event && event.status !== "CANCELLED" && event.is_active;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Show</h1>
          <p className="text-muted-foreground mt-1">
            Update the performance schedule.
          </p>
        </div>
      </div>

      {!isEventEditable && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Event is Cancelled or Inactive.</p>
            <p className="text-sm opacity-90 mt-1">
              You cannot modify shows for an event that is cancelled or inactive.
            </p>
          </div>
        </div>
      )}

      {apiError && (
        <div className="p-4 rounded-md bg-destructive/15 text-destructive border border-destructive/20 font-medium">
          {apiError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Show Details</CardTitle>
          <CardDescription>
            Modify the show date, time, and status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2 p-4 bg-muted/20 border rounded-lg">
                <Label className="text-muted-foreground">Associated Event</Label>
                <div className="font-medium text-lg mt-1">{event?.title || `Event ID: ${show.event}`}</div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="show_date">Show Date <span className="text-destructive">*</span></Label>
                <Input
                  id="show_date"
                  type="date"
                  disabled={!isEventEditable}
                  {...register("show_date")}
                  className={errors.show_date ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.show_date && <p className="text-sm text-destructive">{errors.show_date?.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time <span className="text-destructive">*</span></Label>
                <Input
                  id="start_time"
                  type="time"
                  disabled={!isEventEditable}
                  {...register("start_time")}
                  className={errors.start_time ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.start_time && <p className="text-sm text-destructive">{errors.start_time?.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time <span className="text-destructive">*</span></Label>
                <Input
                  id="end_time"
                  type="time"
                  disabled={!isEventEditable}
                  {...register("end_time")}
                  className={errors.end_time ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.end_time && <p className="text-sm text-destructive">{errors.end_time?.message as string}</p>}
              </div>
              
              <div className="space-y-2 md:col-span-2 p-4 border rounded-md bg-muted/10 mt-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="is_active">Show Status</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    If you set the status to Inactive, this acts as a cancellation. Customers will no longer be able to book this show.
                  </p>
                  <Select
                    value={isActive ? "active" : "inactive"}
                    onValueChange={(val) => setValue("is_active", val === "active", { shouldValidate: true, shouldDirty: true })}
                    disabled={!isEventEditable}
                  >
                    <SelectTrigger id="is_active" className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive (Cancelled)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !isDirty || !isEventEditable}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
