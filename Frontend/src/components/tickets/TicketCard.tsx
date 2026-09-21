import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Ticket as TicketIcon, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { TicketListItem } from "@/types/ticket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TicketCardProps {
  ticket: TicketListItem;
  /** Optional pre-formatted seats string to display if available (e.g. "Row A - Seats 1, 2") */
  seatsInfo?: string;
  className?: string;
}

export function TicketCard({ ticket, seatsInfo, className }: TicketCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success" className="uppercase text-[10px] tracking-wider px-2 py-0.5">Active</Badge>;
      case "USED":
        return <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300 uppercase text-[10px] tracking-wider px-2 py-0.5">Used</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="uppercase text-[10px] tracking-wider px-2 py-0.5">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[10px] tracking-wider px-2 py-0.5">{status}</Badge>;
    }
  };

  return (
    <div className={cn(
      "group relative flex flex-col sm:flex-row bg-card rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
      ticket.status === "CANCELLED" && "opacity-80 grayscale-[0.5]",
      className
    )}>
      {/* Main Ticket Content */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-bold text-lg sm:text-xl text-foreground line-clamp-2 leading-tight">
              {ticket.event.title}
            </h3>
            <div className="flex-shrink-0 mt-0.5">
              {getStatusBadge(ticket.status)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
            <div className="flex items-start text-muted-foreground">
              <Calendar className="mr-2.5 h-4 w-4 shrink-0 mt-0.5 text-foreground/70" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Date</span>
                <span className="text-sm font-medium text-foreground">
                  {format(new Date(ticket.show.date), "MMM d, yyyy")}
                </span>
              </div>
            </div>
            <div className="flex items-start text-muted-foreground">
              <Clock className="mr-2.5 h-4 w-4 shrink-0 mt-0.5 text-foreground/70" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Time</span>
                <span className="text-sm font-medium text-foreground">
                  {ticket.show.start_time.substring(0, 5)}
                </span>
              </div>
            </div>
            <div className="flex items-start text-muted-foreground sm:col-span-2">
              <MapPin className="mr-2.5 h-4 w-4 shrink-0 mt-0.5 text-foreground/70" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Venue</span>
                <span className="text-sm font-medium text-foreground line-clamp-1">
                  {ticket.venue.name}
                </span>
              </div>
            </div>
            
            {seatsInfo && (
              <div className="flex items-start text-muted-foreground sm:col-span-2 mt-1 bg-muted/40 p-2.5 rounded-md border border-dashed">
                <TicketIcon className="mr-2.5 h-4 w-4 shrink-0 mt-0.5 text-foreground/70" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground/60 uppercase tracking-wider">Seats</span>
                  <span className="text-sm font-semibold text-foreground">
                    {seatsInfo}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Perforation Line (Divider) */}
      <div className="relative hidden sm:flex items-center flex-col justify-center">
        {/* Top cutout */}
        <div className="absolute top-[-10px] w-5 h-5 bg-background rounded-full border-b border-l border-r border-transparent z-10" />
        {/* Dashed line */}
        <div className="h-full border-l-2 border-dashed border-border" />
        {/* Bottom cutout */}
        <div className="absolute bottom-[-10px] w-5 h-5 bg-background rounded-full border-t border-l border-r border-transparent z-10" />
      </div>

      <div className="relative sm:hidden flex items-center justify-center w-full px-6">
        <div className="absolute left-[-10px] w-5 h-5 bg-background rounded-full border-r border-t border-b border-transparent z-10" />
        <div className="w-full border-t-2 border-dashed border-border" />
        <div className="absolute right-[-10px] w-5 h-5 bg-background rounded-full border-l border-t border-b border-transparent z-10" />
      </div>

      {/* Ticket Stub (Action Area) */}
      <div className="bg-muted/10 p-5 sm:p-6 sm:w-48 flex flex-col justify-between items-center sm:items-stretch text-center sm:text-left gap-4">
        <div className="flex flex-col items-center sm:items-start w-full">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Ticket No.
          </span>
          <span className="font-mono text-sm sm:text-base font-bold text-foreground bg-background px-3 py-1.5 rounded border w-full text-center truncate">
            {ticket.ticket_number}
          </span>
        </div>
        
        <Button 
          className="w-full mt-auto bg-primary/90 hover:bg-primary"
          variant={ticket.status === 'ACTIVE' ? 'default' : 'secondary'} 
          asChild
        >
          <Link href={`/customer/tickets/${ticket.ticket_number}`}>
            View Ticket <ChevronRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
