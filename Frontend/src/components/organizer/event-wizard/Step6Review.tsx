"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "./wizard-context";
import { organizerService } from "@/services/organizer.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle, Calendar, MapPin, Ticket, ShieldCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Step6Review() {
  const { 
    setStep, 
    eventId, 
    step1Data, 
    selectedVenue, 
    shows, 
    ticketsConfigured,
    eventType
  } = useWizard();
  
  const { toast } = useToast();
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);

  const canPublish = Boolean(
    eventId && 
    selectedVenue && 
    shows.length > 0 && 
    ticketsConfigured
  );

  const handlePublish = async () => {
    if (!eventId) return;
    try {
      setIsPublishing(true);
      await organizerService.updateEventStatus(Number(eventId), "PUBLISHED");
      toast({ title: "Success", description: "Event published successfully!", variant: "success" });
      router.push("/organizer/events");
    } catch (err) {
      toast({ title: "Error", description: "Failed to publish event. Please try again.", variant: "destructive" });
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    toast({ title: "Draft Saved", description: "Your event progress has been saved securely.", variant: "success" });
    router.push("/organizer/events");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Publish</CardTitle>
          <CardDescription>Review your event details before making it public.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Validation Warnings */}
          {!canPublish && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">Cannot publish yet</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  {shows.length === 0 && <li>At least one show schedule must be added.</li>}
                  {!ticketsConfigured && <li>Ticket and seating inventory must be configured.</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Event Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Event Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{step1Data?.title || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium text-gray-900">{eventType === "SEATED" ? "Seated Event" : "General Admission"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900 line-clamp-3">{step1Data?.description || "Not provided"}</p>
              </div>
            </div>
          </div>

          {/* Venue Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Venue</h3>
            {selectedVenue ? (
              <div className="flex items-start space-x-3 text-gray-700">
                <MapPin className="h-5 w-5 mt-0.5 text-indigo-500" />
                <div>
                  <p className="font-medium text-gray-900">{selectedVenue.name}</p>
                  <p className="text-sm">{selectedVenue.address}, {selectedVenue.city}, {selectedVenue.state}</p>
                  <p className="text-sm mt-1 text-gray-500">Capacity: {selectedVenue.capacity}</p>
                </div>
              </div>
            ) : (
              <p className="text-red-500 text-sm">No venue selected</p>
            )}
          </div>

          {/* Shows Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Shows Schedule</h3>
            {shows.length > 0 ? (
              <ul className="space-y-2">
                {shows.map((show, idx) => (
                  <li key={idx} className="flex items-center space-x-3 text-gray-700">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">{new Date(show.show_date).toLocaleDateString()}</span>
                    <span className="text-gray-400">•</span>
                    <span>{show.start_time.substring(0, 5)} - {show.end_time.substring(0, 5)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-red-500 text-sm">No shows scheduled</p>
            )}
          </div>

          {/* Inventory Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Inventory Setup</h3>
            <div className="flex items-center space-x-3 text-gray-700">
              {ticketsConfigured ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">Seating and pricing configuration successfully saved</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600">Pending inventory generation</span>
                </>
              )}
            </div>
          </div>

        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-gray-50">
          <Button variant="outline" onClick={() => setStep(eventType === "GENERAL" ? 4 : 5)} disabled={isPublishing}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isPublishing}>
              Save Draft
            </Button>
            <Button 
              onClick={handlePublish} 
              disabled={!canPublish || isPublishing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Publish Event
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
