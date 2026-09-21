"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, MapPin, Tag } from "lucide-react";
import { Event } from "@/types/event";
import { Button } from "@/components/ui/button";

interface FeaturedEventHeroProps {
  event: Event | null;
}

export function FeaturedEventHero({ event }: FeaturedEventHeroProps) {
  if (!event) return null;

  const imageUrl = event.event_image || `https://picsum.photos/seed/${event.id}/1200/600`;
  const eventDate = event.start_date ? new Date(event.start_date) : null;
  const formattedDate = eventDate && !Number.isNaN(eventDate.getTime()) 
    ? format(eventDate, "EEEE, MMMM d, yyyy") 
    : "Date TBD";

  return (
    <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-8 group">
      {/* Background Image */}
      <Image
        src={imageUrl}
        alt={event.title}
        fill
        priority
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 1200px"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1526] via-[#0A1526]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A1526]/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end z-10">
        <div className="max-w-3xl animate-in slide-in-from-bottom-4 duration-700">
          {/* Category Badge */}
          <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 text-xs font-bold tracking-wider uppercase text-white shadow-sm mb-4">
            Featured Event
          </span>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4 line-clamp-2">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-slate-200 mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-[#c29665]" />
              {formattedDate}
            </span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-[#c29665]" />
              View Venue Details
            </span>
          </div>

          <Button 
            asChild 
            size="lg"
            className="h-12 md:h-14 px-8 rounded-xl bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-semibold shadow-lg shadow-[#3B41C5]/20 text-base"
          >
            <Link href={`/events/${event.id}`}>
              Book Now
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
