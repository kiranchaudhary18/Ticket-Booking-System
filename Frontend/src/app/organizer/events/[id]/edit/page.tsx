"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { eventService } from "@/services/event.service";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Event, Category, Venue } from "@/types/event";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Calendar, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255, "Title must be less than 255 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  venue: z.string().min(1, "Please select a venue"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  age_limit: z.string().refine(val => !val || parseInt(val) >= 1, "Age limit must be at least 1").optional(),
  language: z.string().max(50, "Language must be less than 50 characters").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
  event_image: z.any()
    .refine((file) => !file || file?.size <= MAX_FILE_SIZE, "Max image size is 5MB.")
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    )
    .optional(),
}).refine((data) => {
  return new Date(data.start_date) < new Date(data.end_date);
}, {
  message: "End date must be after start date",
  path: ["end_date"],
}).refine((data) => {
  if (data.status === "PUBLISHED") {
    return new Date(data.end_date) > new Date();
  }
  return true;
}, {
  message: "Cannot publish an event that has already ended",
  path: ["end_date"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EditEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = Number(params.id);
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentEventImage, setCurrentEventImage] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      venue: "",
      start_date: "",
      end_date: "",
      age_limit: "",
      language: "",
      status: "DRAFT",
    },
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [allCategories, allVenues, eventData] = await Promise.all([
        eventService.getCategories(),
        organizerService.getVenues(),
        organizerService.getEvent(eventId),
      ]);
      
      // Organizer can only see active categories (and the current one if it's inactive)
      setCategories(allCategories.filter(c => c.is_active || c.id === eventData.category));
      // Organizer can only select their own active venues (and the current one if inactive)
      setVenues(allVenues.filter(v => v.organizer === user?.id && (v.is_active || v.id === eventData.venue)));
      
      setCurrentEventImage(eventData.event_image);

      // Pre-fill form
      form.reset({
        title: eventData.title,
        description: eventData.description,
        category: eventData.category.toString(),
        venue: eventData.venue.toString(),
        // Format datetime-local requires YYYY-MM-DDThh:mm
        start_date: new Date(eventData.start_date).toISOString().slice(0, 16),
        end_date: new Date(eventData.end_date).toISOString().slice(0, 16),
        age_limit: eventData.age_limit ? eventData.age_limit.toString() : "",
        language: eventData.language || "",
        status: eventData.status,
      });
      
    } catch (err: unknown) {
      console.error("Failed to load event data:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Could not load the event. It might not exist or you don't have permission.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && eventId) {
      loadData();
    }
  }, [user, eventId]);

  const onSubmit = async (data: FormValues) => {
    try {
      let payload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        category: parseInt(data.category),
        venue: parseInt(data.venue),
        start_date: data.start_date,
        end_date: data.end_date,
      };

      if (data.age_limit) payload.age_limit = parseInt(data.age_limit);
      else payload.age_limit = null;
      
      if (data.language) payload.language = data.language;
      else payload.language = "";

      if (data.event_image) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined) {
             formData.append(key, String(payload[key]));
          } else {
             formData.append(key, "");
          }
        });
        formData.append("event_image_upload", data.event_image);
        payload = formData as unknown as Record<string, unknown>;
      }

      await organizerService.updateEvent(eventId, payload);
      
      toast({
        title: "Event Updated",
        description: "The event has been successfully updated.",
      });
      
      router.push(`/organizer/events/${eventId}`);
    } catch (err: unknown) {
      console.error("Failed to update event:", err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || "Please check your inputs and try again.",
        variant: "destructive",
      });
    }
  };

  const { formState: { errors, isSubmitting } } = form;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Something went wrong"
          message={error}
          actionLabel="Return to My Events"
          onAction={() => router.push("/organizer/events")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild aria-label="Go back">
          <Link href={`/organizer/events/${eventId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
          <p className="text-muted-foreground mt-1">
            Update your event details.
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Basic Details
            </CardTitle>
            <CardDescription>
              The core information about your event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title <span className="text-destructive">*</span></Label>
              <Input 
                id="title" 
                placeholder="e.g. Summer Music Festival 2026"
                {...form.register("title")} 
                className={errors.title ? "border-destructive focus-visible:ring-destructive/50" : ""}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <textarea 
                id="description" 
                placeholder="Describe your event in detail..."
                rows={5}
                className={`flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.description ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
                {...form.register("description")} 
              />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val) => form.setValue("category", val || "")} value={form.watch("category")}>
                  <SelectTrigger id="category" className={errors.category ? "border-destructive focus-visible:ring-destructive/50" : ""}>
                    <SelectValue placeholder="Select event category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val) => form.setValue("venue", val || "")} value={form.watch("venue")}>
                  <SelectTrigger id="venue" className={errors.venue ? "border-destructive focus-visible:ring-destructive/50" : ""}>
                    <SelectValue placeholder="Select a venue" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.length === 0 ? (
                      <SelectItem value="none" disabled>No active venues found</SelectItem>
                    ) : (
                      venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id.toString()}>
                          {venue.name} ({venue.city})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.venue && <p className="text-sm text-destructive">{errors.venue.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_image">Event Image</Label>
              {currentEventImage && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Current Image:</p>
                  <div className="relative h-32 w-48">
                    <Image 
                      src={currentEventImage.startsWith('http') ? currentEventImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}${currentEventImage.startsWith('/') ? '' : '/'}${currentEventImage}`} 
                      alt="Current event image" 
                      fill 
                      className="rounded-md object-cover border" 
                      sizes="192px" 
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4">
                <Input 
                  id="event_image" 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) form.setValue("event_image", file);
                  }}
                  className={errors.event_image ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
              </div>
              <p className="text-xs text-muted-foreground">Upload a new image to replace the current one (JPG, PNG, WEBP).</p>
              {errors.event_image && <p className="text-sm text-destructive">{errors.event_image.message as string}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule & Logistics
            </CardTitle>
            <CardDescription>
              Set the timeline and rules for your event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date & Time <span className="text-destructive">*</span></Label>
                <Input 
                  id="start_date" 
                  type="datetime-local"
                  {...form.register("start_date")} 
                  className={errors.start_date ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date & Time <span className="text-destructive">*</span></Label>
                <Input 
                  id="end_date" 
                  type="datetime-local"
                  {...form.register("end_date")} 
                  className={errors.end_date ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input 
                  id="language" 
                  placeholder="e.g. English, Hindi, Multi-lingual"
                  {...form.register("language")} 
                  className={errors.language ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age_limit">Age Limit (Minimum)</Label>
                <Input 
                  id="age_limit" 
                  type="number"
                  min="0"
                  placeholder="e.g. 18 for adults only"
                  {...form.register("age_limit")} 
                  className={errors.age_limit ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.age_limit && <p className="text-sm text-destructive">{errors.age_limit.message as string}</p>}
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-md border text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              To change the event status (Publish, Draft, or Cancel), please use the action buttons on the Event Details page.
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/organizer/events/${eventId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
