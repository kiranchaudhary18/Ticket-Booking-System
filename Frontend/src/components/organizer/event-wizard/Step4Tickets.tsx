"use client";

import React, { useState } from "react";
import { useWizard } from "./wizard-context";
import { organizerService } from "@/services/organizer.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, Plus, Ticket, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const ticketFormSchema = z.object({
  name: z.string().min(1, "Ticket name is required").max(10, "Keep it short (e.g. GA, VIP)"),
  seat_type: z.enum(["REGULAR", "PREMIUM", "VIP"]),
  price: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "Valid price required"),
  quantity: z.string().refine(val => parseInt(val) >= 1, "Quantity must be at least 1"),
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface ConfiguredTicket {
  name: string;
  seat_type: "REGULAR" | "PREMIUM" | "VIP";
  price: number;
  quantity: number;
}

export default function Step4Tickets() {
  const { setStep, venueId, setTicketsConfigured, selectedVenue } = useWizard();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [tickets, setTickets] = useState<ConfiguredTicket[]>([]);

  const currentTotal = tickets.reduce((sum, t) => sum + t.quantity, 0);
  const remainingCapacity = selectedVenue ? selectedVenue.capacity - currentTotal : 0;

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { name: "GA", seat_type: "REGULAR", price: "", quantity: "" }
  });

  const onAddTicket = async (data: TicketFormValues) => {
    if (!venueId) return;
    
    const qty = parseInt(data.quantity);
    if (selectedVenue && currentTotal + qty > selectedVenue.capacity) {
      toast({ 
        title: "Capacity Exceeded", 
        description: `Cannot add ${qty} tickets. Only ${remainingCapacity} spots remaining in this venue.`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsAdding(true);
      const price = parseFloat(data.price);
      
      // Use the bulk create endpoint to generate "seats" that act as GA tickets
      await organizerService.bulkCreateSeats({
        venue: venueId,
        row: data.name.toUpperCase(),
        start_seat_number: 1,
        end_seat_number: qty,
        seat_type: data.seat_type,
        price: price.toString()
      });

      setTickets([...tickets, {
        name: data.name.toUpperCase(),
        seat_type: data.seat_type,
        price,
        quantity: qty
      }]);
      
      toast({ title: "Success", description: `${qty} ${data.name} tickets added`, variant: "success" });
      form.reset();
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.response?.data?.non_field_errors?.[0] || "Failed to add tickets. Make sure the name (row) is unique.", 
        variant: "destructive" 
      });
    } finally {
      setIsAdding(false);
    }
  };

  const removeTicket = async (name: string) => {
    // Cannot easily delete bulk seats right now via one API call in our setup without multiple deletes.
    // For MVP, we instruct organizer they cannot remove them here if they already created them in DB, 
    // or we'd need a backend bulk delete. 
    toast({ title: "Warning", description: "Deleting generated tickets requires managing them from the Seats page after event creation.", variant: "destructive" });
  };

  const handleContinue = () => {
    if (tickets.length === 0) {
      toast({ title: "Action Required", description: "You must add at least one ticket type.", variant: "destructive" });
      return;
    }
    setTicketsConfigured(true);
    setStep(6);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configure Tickets</CardTitle>
          <CardDescription>Set up general admission tickets, pricing, and available quantities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Ticket Form */}
          <form onSubmit={form.handleSubmit(onAddTicket)} className="bg-slate-50 p-4 rounded-lg border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Ticket Name/Code</Label>
                <Input placeholder="e.g. GA" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select onValueChange={(val) => form.setValue("seat_type", val as any)} value={form.watch("seat_type")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" step="0.01" {...form.register("price")} />
                {form.formState.errors.price && <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" {...form.register("quantity")} />
                {form.formState.errors.quantity && <p className="text-sm text-red-500">{form.formState.errors.quantity.message}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Generate Tickets
              </Button>
            </div>
          </form>

          {/* Tickets List */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">Generated Tickets</h4>
            {tickets.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-lg text-gray-500">
                No tickets configured yet. Add at least one ticket type to continue.
              </div>
            ) : (
              tickets.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center text-gray-700 font-semibold w-24">
                      <Ticket className="h-4 w-4 mr-2 text-indigo-500" />
                      {t.name}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {t.seat_type}
                    </div>
                    <div className="text-gray-900 font-medium">
                      ₹{t.price.toFixed(2)}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Qty: {t.quantity}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeTicket(t.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={() => setStep(3)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shows
          </Button>
          <Button onClick={handleContinue} disabled={tickets.length === 0}>
            Continue to Review <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
