"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Event } from "@/types/event";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/button";

interface EventHorizontalScrollProps {
  title: string;
  events: Event[];
  viewAllLink?: string;
  emptyMessage?: string;
}

export function EventHorizontalScroll({ 
  title, 
  events, 
  viewAllLink, 
  emptyMessage = "No events found." 
}: EventHorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" 
        ? scrollLeft - clientWidth + 100 
        : scrollLeft + clientWidth - 100;
        
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-[#0A1526] mb-6">{title}</h3>
        <div className="w-full rounded-2xl bg-slate-50 border border-slate-100 p-8 text-center text-slate-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12 relative group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-[#0A1526]">{title}</h3>
        {viewAllLink && (
          <Button variant="link" asChild className="text-[#3B41C5] hover:text-[#3B41C5]/80 px-0">
            <Link href={viewAllLink}>View All <ChevronRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        )}
      </div>

      <div className="relative">
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-6 pt-2 px-1 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {events.map((event) => (
            <div key={event.id} className="min-w-[280px] w-[280px] md:min-w-[320px] md:w-[320px] shrink-0 snap-start">
              <EventCard event={event} />
            </div>
          ))}
        </div>

        {events.length > 3 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute -left-5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-lg border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute -right-5 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-lg border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
