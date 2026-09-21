"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useWizard } from "./wizard-context";
import { organizerService } from "@/services/organizer.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Seat } from "@/types/booking";

type ConfigData = { seat_type: string; price: number; is_active: boolean };

export default function Step5Seats() {
  const { setStep, venueId, eventId, setTicketsConfigured, selectedVenue } = useWizard();
  const { toast } = useToast();
  
  const [seats, setSeats] = useState<Seat[]>([]);
  const [configs, setConfigs] = useState<Record<number, ConfigData>>({});
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<number>>(new Set());
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [activeType, setActiveType] = useState<string>("REGULAR");
  const [activePrice, setActivePrice] = useState<string>("500");

  useEffect(() => {
    async function loadSeats() {
      if (!venueId || !eventId) return;
      setIsFetching(true);
      try {
        const [venueSeats, eventConfigs] = await Promise.all([
          organizerService.getSeats(venueId as number),
          organizerService.getEventSeatConfigurations(Number(eventId))
        ]);

        setSeats(venueSeats);

        // Pre-fill configurations with existing event configs or fall back to seat default
        const newConfigs: Record<number, ConfigData> = {};
        venueSeats.forEach(seat => {
          const eConf = eventConfigs.find(c => c.seat === seat.id);
          if (eConf) {
            newConfigs[seat.id] = { seat_type: eConf.seat_type, price: parseFloat(eConf.price), is_active: eConf.is_active };
          } else {
            newConfigs[seat.id] = { seat_type: seat.seat_type, price: parseFloat(seat.price as any || "0"), is_active: seat.is_active };
          }
        });
        setConfigs(newConfigs);
        
        // If there are existing configs, mark as configured
        if (eventConfigs.length > 0) {
          setTicketsConfigured(true);
        }
      } catch (err) {
        toast({ title: "Error", description: "Failed to load seats.", variant: "destructive" });
      } finally {
        setIsFetching(false);
      }
    }
    loadSeats();
  }, [venueId, eventId]);

  // Group seats by row
  const rows = useMemo(() => {
    const grouped: Record<string, Seat[]> = {};
    seats.forEach(s => {
      if (!grouped[s.row]) grouped[s.row] = [];
      grouped[s.row].push(s);
    });
    // Sort rows alphabetically
    const sortedKeys = Object.keys(grouped).sort();
    return sortedKeys.map(k => ({
      row: k,
      seats: grouped[k].sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
    }));
  }, [seats]);

  const handleSeatClick = (seatId: number) => {
    const next = new Set(selectedSeatIds);
    if (next.has(seatId)) {
      next.delete(seatId);
    } else {
      next.add(seatId);
    }
    setSelectedSeatIds(next);
  };

  const handleSelectRow = (row: string) => {
    const rowSeats = seats.filter(s => s.row === row);
    const allSelected = rowSeats.every(s => selectedSeatIds.has(s.id));
    
    const next = new Set(selectedSeatIds);
    if (allSelected) {
      rowSeats.forEach(s => next.delete(s.id));
    } else {
      rowSeats.forEach(s => next.add(s.id));
    }
    setSelectedSeatIds(next);
  };

  const applyConfiguration = () => {
    if (selectedSeatIds.size === 0) {
      toast({ title: "No seats selected", description: "Select seats from the map to configure.", variant: "default" });
      return;
    }
    const priceNum = parseFloat(activePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Invalid price", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }

    const nextConfigs = { ...configs };
    selectedSeatIds.forEach(id => {
      nextConfigs[id] = {
        seat_type: activeType,
        price: priceNum,
        is_active: true
      };
    });
    setConfigs(nextConfigs);
    setSelectedSeatIds(new Set());
    toast({ title: "Applied", description: `Configuration applied to ${selectedSeatIds.size} seats locally.`, variant: "success" });
  };

  const handleSave = async () => {
    if (!eventId) return;
    try {
      setIsSaving(true);
      
      // Group by configuration to minimize API calls if backend bulk supports it.
      // But our bulk endpoint takes a single seat_type and price and an array of seat_ids.
      const groups: Record<string, { seat_ids: number[], seat_type: string, price: number }> = {};
      
      Object.entries(configs).forEach(([seatId, conf]) => {
        const key = `${conf.seat_type}_${conf.price}`;
        if (!groups[key]) {
          groups[key] = { seat_ids: [], seat_type: conf.seat_type, price: conf.price };
        }
        groups[key].seat_ids.push(parseInt(seatId));
      });

      // Execute bulk API calls for each unique configuration group
      const promises = Object.values(groups).map(g => 
        organizerService.bulkConfigureEventSeats(Number(eventId), g)
      );
      
      await Promise.all(promises);
      
      setTicketsConfigured(true);
      toast({ title: "Saved successfully", description: "Event seat configuration saved.", variant: "success" });
      setStep(6);
    } catch (err) {
      toast({ title: "Save Failed", description: "Could not save seat configurations.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "VIP": return "bg-purple-500 border-purple-600 text-white";
      case "PREMIUM": return "bg-blue-500 border-blue-600 text-white";
      case "REGULAR": return "bg-indigo-500 border-indigo-600 text-white";
      default: return "bg-gray-200 border-gray-300 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Interactive Map */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader>
            <CardTitle>Interactive Seat Map</CardTitle>
            <CardDescription>Select seats to configure their category and price for this event.</CardDescription>
          </CardHeader>
          <CardContent>
            {isFetching ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : seats.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed rounded-md">
                No physical seats found in this venue. Please configure the venue first.
              </div>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="min-w-max mx-auto space-y-2">
                  <div className="w-full text-center bg-gray-200 text-gray-500 text-xs py-1 rounded-full mb-8 tracking-widest font-semibold shadow-inner">STAGE</div>
                  {rows.map(r => (
                    <div key={r.row} className="flex items-center space-x-4">
                      <div 
                        className="w-6 text-sm font-semibold text-gray-400 text-right cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => handleSelectRow(r.row)}
                        title="Select entire row"
                      >
                        {r.row}
                      </div>
                      <div className="flex space-x-1.5">
                        {r.seats.map(seat => {
                          const conf = configs[seat.id];
                          const isSelected = selectedSeatIds.has(seat.id);
                          const colorClass = conf ? getTypeColor(conf.seat_type) : "bg-gray-200 border-gray-300 text-transparent";
                          
                          return (
                            <button
                              key={seat.id}
                              onClick={() => handleSeatClick(seat.id)}
                              title={`${seat.row}${seat.seat_number} - ${conf?.seat_type} (₹${conf?.price})`}
                              className={`
                                h-7 w-7 rounded-t-md rounded-b-sm border shadow-sm text-[10px] font-bold
                                transition-all flex items-center justify-center
                                ${isSelected ? "ring-2 ring-offset-1 ring-black scale-110 z-10" : "hover:brightness-110 opacity-90 hover:opacity-100"}
                                ${colorClass}
                              `}
                            >
                              {seat.seat_number}
                            </button>
                          );
                        })}
                      </div>
                      <div 
                        className="w-6 text-sm font-semibold text-gray-400 text-left cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => handleSelectRow(r.row)}
                      >
                        {r.row}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Sidebar */}
        <Card className="w-full md:w-80 h-fit sticky top-6">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["REGULAR", "PREMIUM", "VIP"].map(type => (
                    <button
                      key={type}
                      onClick={() => setActiveType(type)}
                      className={`py-2 text-xs font-semibold rounded-md border transition-colors ${
                        activeType === type 
                          ? getTypeColor(type) 
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input 
                  type="number" 
                  value={activePrice} 
                  onChange={(e) => setActivePrice(e.target.value)} 
                  placeholder="e.g. 500"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={applyConfiguration}
                disabled={selectedSeatIds.size === 0}
              >
                Apply to {selectedSeatIds.size} selected
              </Button>
            </div>

            <div className="pt-6 border-t space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Legend</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className={`h-4 w-4 rounded-sm border ${getTypeColor("VIP")}`}></div>
                  <span>VIP</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-4 w-4 rounded-sm border ${getTypeColor("PREMIUM")}`}></div>
                  <span>Premium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`h-4 w-4 rounded-sm border ${getTypeColor("REGULAR")}`}></div>
                  <span>Regular</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between border-t pt-6">
        <Button variant="outline" onClick={() => setStep(3)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shows
        </Button>
        <Button onClick={handleSave} disabled={isSaving || seats.length === 0}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Save Configuration <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
