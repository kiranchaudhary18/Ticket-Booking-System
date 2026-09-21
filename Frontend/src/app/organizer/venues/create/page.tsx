"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
const formSchema = z.object({
  name: z.string().min(3, "Venue name must be at least 3 characters").max(100, "Venue name cannot exceed 100 characters"),
  description: z.string().optional(),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City must be at least 2 characters"),
  state: z.string().min(2, "State must be at least 2 characters"),
  pincode: z.string().min(4, "Pincode is too short").max(20, "Pincode is too long"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  venue_type: z.enum(["INDOOR", "OUTDOOR", "VIRTUAL"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateVenuePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
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
    },
  });

  const venueType = watch("venue_type");

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      await organizerService.createVenue(values);
      
      toast({
        title: "Success",
        description: "Venue created successfully.",
      });
      
      router.push("/organizer/venues");
      router.refresh();
    } catch (error: unknown) {
      console.error("Failed to create venue:", error);
      let errorMessage = "An unexpected error occurred while creating the venue.";
      
      const axiosErr = error as { response?: { data?: Record<string, string | string[]> | { detail?: string } } };
      if (axiosErr.response?.data) {
        if (typeof axiosErr.response.data === "object" && !('detail' in axiosErr.response.data)) {
          const apiErrors = Object.entries(axiosErr.response.data as Record<string, string | string[]>)
            .map(([field, msgs]) => {
              if (Array.isArray(msgs)) return msgs.join(" ");
              return `${field}: ${msgs}`;
            })
            .join(" | ");
          errorMessage = apiErrors || errorMessage;
        } else if ('detail' in axiosErr.response.data && axiosErr.response.data.detail) {
          errorMessage = axiosErr.response.data.detail as string;
        }
      }
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild aria-label="Go back">
          <Link href="/organizer/venues">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Venue</h1>
          <p className="text-muted-foreground mt-1">
            Add a new physical or virtual location to host your events.
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
            Fill in the information about your venue. This will be visible to your customers.
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
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue_type">Venue Type <span className="text-destructive">*</span></Label>
                <Select
                  value={venueType}
                  onValueChange={(val) => { if (val) setValue("venue_type", val as "INDOOR" | "OUTDOOR" | "VIRTUAL", { shouldValidate: true }); }}
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
                  <p className="text-sm text-destructive">{errors.venue_type.message}</p>
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
                  <p className="text-sm text-destructive">{errors.capacity.message}</p>
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
                  <p className="text-sm text-destructive">{errors.address.message}</p>
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
                  <p className="text-sm text-destructive">{errors.city.message}</p>
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
                  <p className="text-sm text-destructive">{errors.state.message}</p>
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
                  <p className="text-sm text-destructive">{errors.pincode.message}</p>
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
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Venue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
