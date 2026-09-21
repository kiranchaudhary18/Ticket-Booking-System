import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin, Tag } from "lucide-react";
import { Event, Category, Venue } from "@/types/event";
import { Button, buttonVariants } from "@/components/ui/button";
import { WishlistButton } from "@/components/events/WishlistButton";
import { formatPrice } from "@/services/pricing.service";
import { getImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  category?: Category;
  venue?: Venue;
  /** Cheapest available ticket price for the event (resolved via the API). */
  startingPrice?: number | null;
  /** Rendered on the left of the card footer, replacing the starting price. */
  actionSlot?: React.ReactNode;
  /** Overrides the footer call to action label. */
  ctaLabel?: string;
  priority?: boolean;
  className?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function EventCard({
  event,
  category,
  venue,
  startingPrice,
  actionSlot,
  ctaLabel = "View Details",
  priority = false,
  className,
}: EventCardProps) {
  // Use a placeholder image if the organizer has not uploaded one yet
  const imageUrl = getImageUrl(event.event_image) || `https://picsum.photos/seed/${event.id}/600/400`;

  const startDate = event.start_date ? new Date(event.start_date) : null;
  const hasValidDate = !!startDate && !Number.isNaN(startDate.getTime());

  const dateText = hasValidDate ? dateFormatter.format(startDate as Date) : "Date to be announced";
  const timeText = hasValidDate ? timeFormatter.format(startDate as Date) : null;

  const categoryName = category?.name || null;
  const locationText = venue
    ? [venue.name, venue.city].filter(Boolean).join(", ")
    : "Venue to be announced";

  const formattedPrice = formatPrice(startingPrice);

  // Drafts and cancelled events are visible only to their organizer / admins,
  // so surfacing the non-public status helps them recognise those rows.
  const showStatus = event.status !== "PUBLISHED";

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-[0_2px_12px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)]",
        className
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        <Image
          src={imageUrl}
          alt={event.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {/* A single subtle overlay keeps the badges legible on any photo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/5" />

        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          {categoryName && (
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-tight text-slate-900 shadow-sm">
              {categoryName}
            </span>
          )}
          {showStatus && (
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {event.status}
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 z-10">
          <WishlistButton
            eventId={event.id}
            variant="icon"
            className="h-8 w-8 rounded-full border border-white/40 bg-black/20 text-white backdrop-blur-md hover:bg-black/40 hover:text-white"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">{dateText}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{locationText}</span>
          </div>
        </div>

        <h3 className="mt-2 line-clamp-1 text-[15px] font-extrabold tracking-tight text-[#0A1526] transition-colors group-hover:text-primary">
          <Link href={`/events/${event.id}`}>{event.title}</Link>
        </h3>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {actionSlot ? (
              actionSlot
            ) : formattedPrice ? (
              <p className="text-[13px]">
                <span className="font-medium text-slate-500">From </span>
                <span className="font-extrabold text-[#0A1526]">{formattedPrice}</span>
              </p>
            ) : null}
          </div>

            <Link
              href={`/events/${event.id}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-[#3B41C5] transition-colors hover:bg-[#3B41C5] hover:text-white"
              aria-label={ctaLabel}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
    </article>
  );
}
