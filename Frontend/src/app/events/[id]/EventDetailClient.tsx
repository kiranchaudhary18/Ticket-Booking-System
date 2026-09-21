"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  Clock,
  Info,
  Languages,
  MapPin,
  ShieldCheck,
  Tag,
  Ticket,
  User,
} from "lucide-react";

import { eventService } from "@/services/event.service";
import { bookingService } from "@/services/booking.service";
import { formatPrice, pricingService } from "@/services/pricing.service";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { EventDetail } from "@/types/event";
import { Show } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { EventDetailSkeleton } from "@/components/events/EventDetailSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { WishlistButton } from "@/components/events/WishlistButton";
import { getImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const showDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function EventDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [startingPrice, setStartingPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch the event and its shows concurrently
      const [eventData, showsData] = await Promise.all([
        eventService.getEventDetail(eventId),
        bookingService.getShows({ event: eventId }),
      ]);

      setEvent(eventData);
      // Keep only the shows belonging to this event
      setShows((showsData || []).filter((show) => String(show.event) === String(eventId)));

      // Starting price is supplementary (cheapest seat of the event's venue)
      pricingService
        .getStartingPriceForVenue(eventData.venue)
        .then(setStartingPrice)
        .catch(() => undefined);
    } catch (err: unknown) {
      console.error("Failed to load event details:", err);
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr.response?.status;

      setError(
        status === 404
          ? "This event could not be found. It may have been removed by the organizer."
          : "We could not load this event right now. Please try again in a moment."
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    // Deferred a microtask so the state updates inside loadEvent don't cascade renders.
    void Promise.resolve().then(loadEvent);
  }, [loadEvent]);

  const isRestrictedRole = isAuthenticated && !!user && user.role !== UserRole.CUSTOMER;

  const imageUrl = getImageUrl(event?.event_image) || `https://picsum.photos/seed/${eventId}/1200/700`;

  const rawStartDate = event?.start_date ? new Date(event.start_date) : null;
  const startDate = rawStartDate && !Number.isNaN(rawStartDate.getTime()) ? rawStartDate : null;

  const formattedDate = startDate ? dateFormatter.format(startDate) : "Date to be announced";
  const formattedTime = startDate ? timeFormatter.format(startDate) : null;

  const selectedShow = useMemo(
    () => shows.find((show) => show.id === selectedShowId) || null,
    [shows, selectedShowId]
  );

  const formattedPrice = formatPrice(startingPrice);

  /** Booking flow: login redirect, role guard and show selection are preserved. */
  const handleBookTickets = () => {
    if (!selectedShowId) return;
    const bookingPath = `/events/${eventId}/book/${selectedShowId}`;

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(bookingPath)}`);
      return;
    }

    if (user && user.role !== UserRole.CUSTOMER) {
      router.push(user.role === UserRole.ADMIN ? "/admin/dashboard" : "/organizer/dashboard");
      return;
    }

    router.push(bookingPath);
  };

  if (isLoading) {
    return <EventDetailSkeleton />;
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-16 md:px-6">
        <ErrorState
          title="Unable to load event"
          message={error || "An unexpected error occurred while loading this event."}
          onRetry={loadEvent}
        />
        <div className="mt-6 flex justify-center">
          <Link
            href="/events"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Back to all events
          </Link>
        </div>
      </div>
    );
  }

  /** Show dates arrive as date-only strings, so parse them as local dates to avoid a day shift. */
  const parseDateOnly = (value?: string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  /** Show times arrive as "HH:MM(:SS)" strings; format them through the shared time formatter. */
  const formatShowTime = (value?: string | null): string | null => {
    if (!value) return null;
    const parsed = new Date(/^\d{2}:\d{2}/.test(value) ? `1970-01-01T${value}` : value);
    return Number.isNaN(parsed.getTime()) ? null : timeFormatter.format(parsed);
  };

  const showStatus = event.status !== "PUBLISHED";
  const venueLine = [event.venue_name, event.venue_city, event.venue_state]
    .filter(Boolean)
    .join(", ");

  /** "Sat, Sep 20 • 6:30 PM" for the currently selected show. */
  const selectedShowLabel = (() => {
    if (!selectedShow) return null;
    const showDate = parseDateOnly(selectedShow.show_date);
    const startTime = formatShowTime(selectedShow.start_time);
    return (
      [showDate ? showDateFormatter.format(showDate) : null, startTime]
        .filter(Boolean)
        .join(" • ") || "Date to be announced"
    );
  })();

  /** Read-only facts rendered in the details grid (missing values are simply omitted). */
  const detailFacts = [
    { icon: Calendar, label: "Date", value: formattedDate },
    { icon: Clock, label: "Time", value: formattedTime ?? "To be announced" },
    { icon: MapPin, label: "Venue", value: venueLine || "Venue to be announced" },
    { icon: Languages, label: "Language", value: event.language || "Not specified" },
    { icon: Info, label: "Age limit", value: event.age_limit ? `${event.age_limit}+` : "All ages" },
    { icon: Tag, label: "Category", value: event.category_name || "Uncategorised" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-20">
      {/* Hero banner */}
      <div className="relative h-[40vh] w-full md:h-[55vh]">
        <Image
          src={imageUrl}
          alt={event.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0A1526] via-[#0A1526]/60 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="mx-auto w-full max-w-7xl px-6 md:px-12 pb-10 md:pb-16">
            <Link
              href="/events"
              className="mb-8 inline-flex items-center text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Back to events
            </Link>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              {event.category_name && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                  <Tag className="h-3.5 w-3.5 text-[#c29665]" aria-hidden="true" />
                  {event.category_name}
                </span>
              )}
              {showStatus && (
                <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-300">
                  {event.status}
                </span>
              )}
            </div>

            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl drop-shadow-sm">
              {event.title}
            </h1>

            <p className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm md:text-base text-slate-200">
              <span className="inline-flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-[#c29665]" aria-hidden="true" />
                {formattedDate}
              </span>
              {formattedTime && (
                <span className="inline-flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-[#c29665]" aria-hidden="true" />
                  {formattedTime}
                </span>
              )}
              <span className="inline-flex items-center">
                <MapPin className="mr-2 h-5 w-5 text-[#c29665]" aria-hidden="true" />
                {venueLine || "Venue to be announced"}
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-6 md:px-12 pt-12 md:pt-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-12 lg:col-span-2">
            <section>
              <h2 className="mb-6 text-2xl font-bold tracking-tight text-[#0A1526] md:text-3xl">
                About this event
              </h2>
              <p className="whitespace-pre-line text-lg leading-relaxed text-slate-600">
                {event.description || "No description has been provided for this event yet."}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h2 className="sr-only">Event details</h2>
              <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {detailFacts.map((fact) => (
                  <li key={fact.label} className="flex items-start gap-5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#3B41C5]">
                      <fact.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex flex-col justify-center">
                      <span className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                        {fact.label}
                      </span>
                      <span className="mt-1 block text-[15px] font-semibold text-[#0A1526]">
                        {fact.value}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-8 py-6">
              <span className="inline-flex items-center text-[15px] font-medium text-emerald-700">
                <ShieldCheck className="mr-2 h-5 w-5 text-emerald-500" aria-hidden="true" />
                Secure Razorpay checkout
              </span>
              <span className="inline-flex items-center text-[15px] font-medium text-emerald-700">
                <Ticket className="mr-2 h-5 w-5 text-emerald-500" aria-hidden="true" />
                Instant QR e-ticket after payment
              </span>
            </section>
          </div>
          {/* Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_8px_40px_rgb(0,0,0,0.06)] lg:sticky lg:top-10">
              <div className="space-y-6 p-8">
                <div className="flex items-start gap-4">
                  <MapPin className="mt-0.5 h-6 w-6 shrink-0 text-[#c29665]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-[#0A1526]">
                      {event.venue_name || "Venue to be announced"}
                    </p>
                    <p className="mt-1 truncate text-[15px] text-slate-500">
                      {[event.venue_city, event.venue_state].filter(Boolean).join(", ") ||
                        "Location to be announced"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 border-t border-slate-100 pt-6">
                  <Calendar className="mt-0.5 h-6 w-6 shrink-0 text-[#c29665]" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-[#0A1526]">{formattedDate}</p>
                    <p className="mt-1 text-[15px] text-slate-500">
                      {formattedTime ?? "Time to be announced"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <WishlistButton eventId={event.id} variant="button" className="w-full h-12 rounded-xl text-[15px]" />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    Tickets from
                  </p>
                  <p className="mt-2 flex items-center text-3xl font-extrabold tracking-tight text-[#0A1526]">
                    <Ticket className="mr-2 h-7 w-7 text-[#3B41C5]" aria-hidden="true" strokeWidth={2.5} />
                    {formattedPrice ?? "See venue pricing"}
                  </p>
                </div>
<div className="border-t border-slate-100 pt-6">
                  {shows.length > 0 ? (
                    <>
                      <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Choose a show
                      </p>
                      <div className="space-y-3">
                        {shows.map((show) => {
                          const isSelected = show.id === selectedShowId;
                          const showDate = parseDateOnly(show.show_date);
                          const startTime = formatShowTime(show.start_time);
                          const endTime = formatShowTime(show.end_time);

                          return (
                            <button
                              key={show.id}
                              type="button"
                              onClick={() => setSelectedShowId(show.id)}
                              aria-pressed={isSelected}
                              className={cn(
                                "flex w-full items-start justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200",
                                isSelected
                                  ? "border-[#3B41C5] bg-[#EEF2FF] shadow-sm shadow-[#3B41C5]/10"
                                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                              )}
                            >
                              <span className="min-w-0">
                                <span className="block text-[15px] font-bold text-[#0A1526]">
                                  {showDate
                                    ? showDateFormatter.format(showDate)
                                    : "Date to be announced"}
                                </span>
                                <span className="mt-1 block text-sm font-medium text-slate-500">
                                  {startTime
                                    ? `${startTime}${endTime ? ` – ${endTime}` : ""}`
                                    : "Time to be announced"}
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                                  isSelected ? "border-[#3B41C5] bg-[#3B41C5]" : "border-slate-300"
                                )}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                      No shows have been scheduled for this event yet. Please check back later.
                    </p>
                  )}
                </div>
{selectedShowLabel && (
                  <p className="flex items-start gap-3 rounded-xl border border-[#3B41C5]/20 bg-[#EEF2FF] px-4 py-3.5 text-sm">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#3B41C5]" aria-hidden="true" />
                    <span>
                      <span className="block font-bold uppercase tracking-wider text-[#3B41C5]/80 text-[10px]">
                        Selected show
                      </span>
                      <span className="mt-0.5 block font-bold text-[#3B41C5]">
                        {selectedShowLabel}
                      </span>
                    </span>
                  </p>
                )}

                {isRestrictedRole && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                    Organizer and admin accounts cannot book tickets. Sign in with a customer account
                    to continue.
                  </p>
                )}

                <Button
                  className="h-14 rounded-xl w-full text-[15px] font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white shadow-lg shadow-[#3B41C5]/20"
                  onClick={handleBookTickets}
                  disabled={!selectedShowId || isRestrictedRole}
                >
                  <Ticket className="mr-2 h-5 w-5" aria-hidden="true" />
                  Book Tickets
                </Button>

                <p className="text-center text-[13px] font-medium text-slate-400">
                  {isRestrictedRole
                    ? "Switch to a customer account to book tickets."
                    : "Seat selection and secure payment happen on the next step."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
