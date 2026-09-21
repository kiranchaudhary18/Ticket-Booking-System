"use client";

import React, { useEffect, useState } from "react";
import { useWizard } from "./wizard-context";
import { organizerService } from "@/services/organizer.service";
import { Venue, VenueType } from "@/types/event";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ArrowLeft, MapPin, Plus, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const venueFormSchema = z.object({
  name: z.string().min(3, "Venue name is required"),
  description: z.string().optional(),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Valid 6-digit Indian pincode required"),
  capacity: z.string().refine(val => parseInt(val) >= 1, "Capacity must be at least 1"),
  venue_type: z.enum(["INDOOR", "OUTDOOR", "VIRTUAL", "OTHER"]),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

export default function Step2Venue() {
  const { 
    setStep, 
    venueId, 
    setVenueId, 
    step1Data, 
    eventId, 
    setEventId, 
    setSelectedVenue 
  } = useWizard();
  
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: "", description: "", address: "", city: "", state: "", pincode: "", capacity: "", venue_type: "INDOOR"
    }
  });

  const loadVenues = async () => {
    try {
      setIsLoading(true);
      const allVenues = await organizerService.getVenues();
      setVenues(allVenues.filter(v => v.is_active));
    } catch (err) {
      toast({ title: "Error", description: "Failed to load venues", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [toast]);

  const onVenueCreate = async (data: VenueFormValues) => {
    try {
      const createdVenue = await organizerService.createVenue({
        ...data,
        capacity: parseInt(data.capacity),
        venue_type: data.venue_type as VenueType
      });
      toast({ title: "Success", description: "Venue created successfully", variant: "success" });
      setVenues([createdVenue, ...venues]);
      setVenueId(createdVenue.id);
      setSelectedVenue(createdVenue);
      setIsDialogOpen(false);
      form.reset();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create venue", variant: "destructive" });
    }
  };

  const handleContinue = async () => {
    if (!venueId) {
      toast({ title: "Selection Required", description: "Please select a venue", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // If event is not created yet, create it now!
      if (!eventId && step1Data) {
        const formData = new FormData();
        formData.append("title", step1Data.title);
        formData.append("description", step1Data.description);
        formData.append("category", step1Data.category);
        formData.append("venue", venueId.toString());
        formData.append("start_date", new Date(step1Data.start_date).toISOString());
        formData.append("end_date", new Date(step1Data.end_date).toISOString());
        formData.append("status", "DRAFT");
        
        if (step1Data.age_limit) formData.append("age_limit", step1Data.age_limit);
        if (step1Data.language) formData.append("language", step1Data.language);
        if (step1Data.event_image) formData.append("event_image_upload", step1Data.event_image);

        const createdEvent = await organizerService.createEvent(formData);
        setEventId(createdEvent.id);
      }
      
      setStep(3);
    } catch (err) {
      toast({ title: "Error", description: "Failed to save event details. Please check the form.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Select Venue</CardTitle>
            <CardDescription>Choose where your event will take place.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>
              <Plus className="mr-2 h-4 w-4" /> Create New Venue
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Venue</DialogTitle>
                <DialogDescription>Add a new location to host your events.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onVenueCreate)} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Venue Name *</Label>
                    <Input {...form.register("name")} />
                    {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Venue Type *</Label>
                    <Select onValueChange={(val) => form.setValue("venue_type", val as any)} value={form.watch("venue_type")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INDOOR">Indoor</SelectItem>
                        <SelectItem value="OUTDOOR">Outdoor</SelectItem>
                        <SelectItem value="VIRTUAL">Virtual</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea {...form.register("description")} />
                </div>

                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input {...form.register("address")} />
                  {form.formState.errors.address && <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input {...form.register("city")} />
                    {form.formState.errors.city && <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Input {...form.register("state")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode *</Label>
                    <Input {...form.register("pincode")} />
                    {form.formState.errors.pincode && <p className="text-sm text-red-500">{form.formState.errors.pincode.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total Capacity *</Label>
                  <Input type="number" {...form.register("capacity")} />
                  {form.formState.errors.capacity && <p className="text-sm text-red-500">{form.formState.errors.capacity.message}</p>}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Venue"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : venues.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No venues found</h3>
              <p className="text-gray-500 mb-4">Create your first venue to continue.</p>
              <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Venue</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto p-1">
              {venues.map(v => (
                <div 
                  key={v.id}
                  onClick={() => {
                    setVenueId(v.id);
                    setSelectedVenue(v);
                  }}
                  className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    venueId === v.id ? "border-indigo-600 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {venueId === v.id && (
                    <div className="absolute top-3 right-3 text-indigo-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                  <h4 className="font-semibold text-lg mb-1 pr-6 truncate">{v.name}</h4>
                  <div className="flex items-start text-sm text-gray-500 mb-2">
                    <MapPin className="h-4 w-4 mr-1 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{v.address}, {v.city}</span>
                  </div>
                  <div className="text-sm font-medium mt-auto">
                    Capacity: {v.capacity.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleContinue} disabled={!venueId || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Continue"}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
