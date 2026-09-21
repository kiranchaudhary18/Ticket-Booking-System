"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Venue } from "@/types/event";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

const formSchema = z.object({
  name: z.string().min(3, "Venue name must be at least 3 characters").max(100, "Venue name cannot exceed 100 characters"),
  description: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  pincode: z.string().min(4, "Pincode is too short").max(20, "Pincode is too long"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  venue_type: z.enum(["INDOOR", "OUTDOOR", "VIRTUAL"]),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditVenuePage() {
  const router = useRouter();
  const params = useParams();
  const venueId = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();
  
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
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      capacity: 100,
      venue_type: "INDOOR",
      is_active: true,
    },
  });

  const venueType = watch("venue_type");
  const isActive = watch("is_active");

  useEffect(() => {
    async function fetchVenue() {
      if (!user || isNaN(venueId)) return;
      
      try {
        setIsPageLoading(true);
        // Find venue by ID
        const allVenues = await organizerService.getVenues();
        const currentVenue = allVenues.find(v => v.id === venueId && v.organizer === user.id);
        
        if (!currentVenue) {
          setPageError("Venue not found or you do not have permission to edit it.");
          setIsPageLoading(false);
          return;
        }

        // Prefill form
        reset({
          name: currentVenue.name,
          description: currentVenue.description || "",
          address: currentVenue.address,
          city: currentVenue.city,
          state: currentVenue.state,
          pincode: currentVenue.pincode,
          capacity: currentVenue.capacity,
          venue_type: currentVenue.venue_type as "INDOOR" | "OUTDOOR" | "VIRTUAL",
          is_active: currentVenue.is_active,
        });

      } catch (err) {
        console.error("Error loading venue:", err);
        setPageError("An error occurred while loading venue data.");
      } finally {
        setIsPageLoading(false);
      }
    }
    
    fetchVenue();
  }, [user, venueId, reset]);

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      await organizerService.updateVenue(venueId, values);
      
      toast({
        title: "Success",
        description: "Venue updated successfully.",
      });
      
      router.push(`/organizer/venues/${venueId}`);
      router.refresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> | { detail?: string } } };
      console.error("Failed to update venue:", error);
      let errorMessage = "An unexpected error occurred while updating the venue.";
      
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
  }

  if (isPageLoading) {
    return <PageSkeleton />;
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Something went wrong"
          message={pageError}
          actionLabel="Back to Venues"
          onAction={() => router.push("/organizer/venues")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Go back">
          <Link href={`/organizer/venues/${venueId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Venue</h1>
          <p className="text-muted-foreground mt-1">
            Update your venue details.
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
          <CardTitle>Venue Details</CardTitle>
          <CardDescription>
            Modify the information about your venue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Venue Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Grand City Stadium"
                  {...register("name")}
                  className={errors.name ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name?.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue_type">Venue Type <span className="text-destructive">*</span></Label>
                <Select
                  value={venueType as string}
                  onValueChange={(val) => { if (val) setValue("venue_type", val as "INDOOR" | "OUTDOOR" | "VIRTUAL", { shouldValidate: true, shouldDirty: true }); }}
                >
                  <SelectTrigger id="venue_type" className={errors.venue_type ? "border-destructive focus-visible:ring-destructive/50" : ""}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDOOR">Indoor</SelectItem>
                    <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                  </SelectContent>
                </Select>
                {errors.venue_type && (
                  <p className="text-sm text-destructive">{errors.venue_type?.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Total Capacity <span className="text-destructive">*</span></Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  {...register("capacity")}
                  className={errors.capacity ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                <p className="text-xs text-muted-foreground">Maximum number of attendees</p>
                {errors.capacity && (
                  <p className="text-sm text-destructive">{errors.capacity?.message as string}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                <Input
                  id="address"
                  placeholder="Street address"
                  {...register("address")}
                  className={errors.address ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.address && (
                  <p className="text-sm text-destructive">{errors.address?.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                <Input
                  id="city"
                  placeholder="e.g. Mumbai"
                  {...register("city")}
                  className={errors.city ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city?.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                <Input
                  id="state"
                  placeholder="e.g. Maharashtra"
                  {...register("state")}
                  className={errors.state ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state?.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode / Zip <span className="text-destructive">*</span></Label>
                <Input
                  id="pincode"
                  placeholder="e.g. 400001"
                  {...register("pincode")}
                  className={errors.pincode ? "border-destructive focus-visible:ring-destructive/50" : ""}
                />
                {errors.pincode && (
                  <p className="text-sm text-destructive">{errors.pincode?.message as string}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the venue, facilities, and accessibility options..."
                  className={`min-h-[100px] ${errors.description ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description?.message as string}</p>
                )}
              </div>
              
              <div className="space-y-2 md:col-span-2 p-4 border rounded-md bg-muted/20">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="is_active">Venue Status</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Inactive venues will not be visible to customers and cannot be selected for new events.
                  </p>
                  <Select
                    value={isActive ? "active" : "inactive"}
                    onValueChange={(val) => setValue("is_active", val === "active", { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger id="is_active" className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
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
