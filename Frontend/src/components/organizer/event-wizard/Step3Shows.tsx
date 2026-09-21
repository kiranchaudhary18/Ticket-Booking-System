"use client";

import React, { useState } from "react";
import { useWizard } from "./wizard-context";
import { organizerService } from "@/services/organizer.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Plus, Calendar, Clock, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const showFormSchema = z.object({
  show_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
}).refine((data) => {
  return data.start_time < data.end_time;
}, {
  message: "End time must be after start time",
  path: ["end_time"],
});

type ShowFormValues = z.infer<typeof showFormSchema>;

export default function Step3Shows() {
  const { setStep, eventId, shows, setShows, eventType } = useWizard();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<ShowFormValues>({
    resolver: zodResolver(showFormSchema),
    defaultValues: { show_date: "", start_time: "", end_time: "" }
  });

  const onAddShow = async (data: ShowFormValues) => {
    if (!eventId) return;
    try {
      setIsAdding(true);
      const newShow = await organizerService.createShow({
        event: Number(eventId),
        show_date: data.show_date,
        start_time: data.start_time + ":00", // Format for backend
        end_time: data.end_time + ":00",
      });
      setShows([...shows, newShow]);
      toast({ title: "Success", description: "Show added successfully", variant: "success" });
      form.reset();
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.response?.data?.non_field_errors?.[0] || "Failed to add show. Check for duplicate schedules.", 
        variant: "destructive" 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeShow = async (id: number) => {
    try {
      await organizerService.deleteShow(id);
      setShows(shows.filter(s => s.id !== id));
      toast({ title: "Success", description: "Show removed" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to remove show", variant: "destructive" });
    }
  };

  const handleContinue = () => {
    if (shows.length === 0) {
      toast({ title: "Action Required", description: "You must add at least one show.", variant: "destructive" });
      return;
    }
    
    // If event is GENERAL, go to Tickets (Step 4)
    // If event is SEATED, go to Seats (Step 5)
    setStep(eventType === "GENERAL" ? 4 : 5);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Shows</CardTitle>
          <CardDescription>Add one or multiple shows for your event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Show Form */}
          <form onSubmit={form.handleSubmit(onAddShow)} className="bg-slate-50 p-4 rounded-lg border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" {...form.register("show_date")} />
                {form.formState.errors.show_date && <p className="text-sm text-red-500">{form.formState.errors.show_date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" {...form.register("start_time")} />
                {form.formState.errors.start_time && <p className="text-sm text-red-500">{form.formState.errors.start_time.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" {...form.register("end_time")} />
                {form.formState.errors.end_time && <p className="text-sm text-red-500">{form.formState.errors.end_time.message}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Show
              </Button>
            </div>
          </form>

          {/* Shows List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">Configured Shows</h4>
            {shows.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg text-gray-500">
                No shows added yet. Add at least one show.
              </div>
            ) : (
              shows.map((show, idx) => (
                <div key={show.id || idx} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center text-gray-700">
                      <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                      {new Date(show.show_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Clock className="h-4 w-4 mr-2 text-indigo-500" />
                      {show.start_time.substring(0, 5)} - {show.end_time.substring(0, 5)}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeShow(show.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={() => setStep(2)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button onClick={handleContinue}>
            Continue to Tickets <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
