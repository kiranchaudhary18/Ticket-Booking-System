"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Headphones,
  Laugh,
  Music,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Theater,
  TicketCheck,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/events/EventCard";
import { EventsGridSkeleton } from "@/components/events/EventCardSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { HomeHero } from "@/components/home/HomeHero";
import { eventService } from "@/services/event.service";
import { Event, Category, EventFilterParams } from "@/types/event";

/** Professional outline icon per category (the Backend does not provide icons). */
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("music") || n.includes("concert")) return Music;
  if (n.includes("comedy")) return Laugh;
  if (n.includes("theater") || n.includes("theatre") || n.includes("play")) return Theater;
  if (n.includes("tech") || n.includes("business")) return Briefcase;
  if (n.includes("workshop") || n.includes("class")) return BookOpen;
  if (n.includes("sports")) return Tv;
  return Star; // fallback
};

/** Shown when the categories API is empty, so the section never feels broken. */
const FALLBACK_CATEGORIES = [
  { title: "Music Concerts", icon: Music },
  { title: "Standup Comedy", icon: Laugh },
  { title: "Theater Plays", icon: Theater },
  { title: "Sports", icon: Tv },
];

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    description:
      "Payments run through Razorpay, so every booking is confirmed the moment the payment clears.",
  },
  {
    icon: TicketCheck,
    title: "Instant e-tickets",
    description:
      "Each confirmed booking issues a QR e-ticket that works at the gate — no printing required.",
  },
  {
    icon: BadgeCheck,
    title: "Verified organizers",
    description:
      "Events are published by vetted organizers and reviewed by our team before they go on sale.",
  },
];

const CONTACT_CHANNELS = [
  {
    icon: Headphones,
    title: "Booking & payment help",
    description:
      "Stuck on a payment or choosing seats? Reach our support team any day of the week.",
  },
  {
    icon: TicketCheck,
    title: "Already booked?",
    description:
      "View, download or re-issue your tickets from My Bookings whenever you need them.",
  },
];

/**
 * The homepage keeps its historical query payload. `limit` / `ordering` are ignored
 * by the events endpoint (it paginates via `page_size`), so the request is unchanged.
 */
type HomepageEventQuery = EventFilterParams & { limit?: number; ordering?: string };

const HOMEPAGE_EVENT_QUERY: HomepageEventQuery = {
  page: 1,
  limit: 6,
  ordering: "start_date",
};

export default function LandingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [eventsRes, catsRes] = await Promise.all([
          eventService.getEvents(HOMEPAGE_EVENT_QUERY).catch(() => null),
          eventService.getCategories().catch(() => [])
        ]);

        if (eventsRes?.results) {
          setEvents(eventsRes.results);
        }
        if (catsRes) {
          setCategories(catsRes);
        }
      } catch (error) {
        console.error("Error loading landing page data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero: editorial two-column introduction with the primary search */}
      <HomeHero categories={categories} featuredEvent={events[0] ?? null} />

      {/* Featured Categories */}
      <section id="categories" className="py-10 md:py-14">
        <div className="container mx-auto px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c29665]">
                EXPLORE
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1526] md:text-4xl">
                Browse by Category
              </h2>
            </div>
            <Link 
              href="/categories"
              className="hidden shrink-0 self-start text-sm font-semibold text-[#3B41C5] hover:underline md:inline-flex md:items-center md:self-auto"
            >
              View All Categories
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-[120px] rounded-[1rem]" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {categories.slice(0, 8).map((category, index) => {
                  const Icon = getCategoryIcon(category.name);
                  const isFirst = index === 0;
                  
                  return (
                    <Link
                      key={category.id}
                      href={`/events?category=${category.id}`}
                      className={`group flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-[1rem] border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        isFirst 
                          ? "border-[#818CF8]/40 bg-[#EEF2FF]" 
                          : "border-border/40 bg-white hover:border-[#818CF8]/40 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <Icon 
                        className={`h-6 w-6 ${isFirst ? "text-[#3B41C5]" : "text-slate-600 group-hover:text-[#3B41C5]"}`} 
                        strokeWidth={1.5} 
                        aria-hidden="true" 
                      />
                      <div className="text-center">
                        <span className={`block text-xs font-bold tracking-tight ${isFirst ? "text-[#3B41C5]" : "text-slate-800"}`}>
                          {category.name}
                        </span>
                        <span className={`mt-0.5 block text-[10px] font-medium ${isFirst ? "text-[#3B41C5]/70" : "text-slate-500"}`}>
                          {120 - (index * 10)}+ Events
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {/* Fallback Categories if API is empty */}
                {FALLBACK_CATEGORIES.map((category, index) => {
                  const isFirst = index === 0;
                  
                  return (
                    <Link
                      key={category.title}
                      href={`/events?search=${encodeURIComponent(category.title)}`}
                      className={`group flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-[1rem] border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                        isFirst 
                          ? "border-[#818CF8]/40 bg-[#EEF2FF]" 
                          : "border-border/40 bg-white hover:border-[#818CF8]/40 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <category.icon 
                        className={`h-6 w-6 ${isFirst ? "text-[#3B41C5]" : "text-slate-600 group-hover:text-[#3B41C5]"}`} 
                        strokeWidth={1.5} 
                        aria-hidden="true" 
                      />
                      <div className="text-center">
                        <span className={`block text-xs font-bold tracking-tight ${isFirst ? "text-[#3B41C5]" : "text-slate-800"}`}>
                          {category.title}
                        </span>
                        <span className={`mt-0.5 block text-[10px] font-medium ${isFirst ? "text-[#3B41C5]/70" : "text-slate-500"}`}>
                          {120 - (index * 10)}+ Events
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section id="events" className="border-t border-border/40 py-10 md:py-14 bg-muted/10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c29665]">
                TRENDING NOW
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0A1526] md:text-4xl">
                Popular Events
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Don&apos;t miss out on the most popular events right now.
              </p>
            </div>
            
            <div className="hidden items-center gap-4 md:flex">
              <Link 
                href="/events"
                className="text-sm font-semibold text-[#3B41C5] hover:underline flex items-center"
              >
                See All Events
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-2">
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 cursor-not-allowed" aria-label="Previous">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md" aria-label="Next">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-[380px] rounded-xl" />
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {events.slice(0, 4).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    category={categories.find((c) => String(c.id) === String(event.category))}
                    priority={index < 3}
                    actionSlot={
                      <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {categories.find((c) => String(c.id) === String(event.category))?.name ||
                          "Live event"}
                      </span>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border">
                <EmptyState
                  icon={<Search className="h-8 w-8 text-muted-foreground" />}
                  title="No trending events found"
                  description="Check back later for new events, or explore all categories."
                />
              </div>
            )}
          </div>

          <div className="mt-12 flex justify-center md:hidden">
            <Button asChild variant="outline" className="h-12 w-full rounded-xl font-medium">
              <Link href="/events">See all events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About: the trust story behind the platform */}
      <section id="about" className="border-t border-border/40 py-10 md:py-14">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Why TicketMaster
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              A calmer way to buy tickets
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              We keep the whole journey in one place — discovering the line-up, choosing your seats
              and walking in with a ticket on your phone.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {VALUE_PROPS.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-border/40 bg-card/40 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-muted/40 text-primary">
                  <value.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-border/40 py-10 md:py-14 bg-muted/10">
        <div className="container mx-auto px-6">
          <div className="relative overflow-hidden rounded-[28px] border border-border/40 bg-card/50 px-8 py-10 shadow-sm md:px-12 md:py-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(80%_100%_at_100%_0%,rgba(201,168,106,0.16),transparent_65%),radial-gradient(70%_90%_at_100%_100%,rgba(91,92,226,0.08),transparent_65%)]"
            />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div className="max-w-lg">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Contact
                </span>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  Questions before you book?
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Whether you are planning a group night out or sorting a payment, sign in to pick
                  up your bookings — or browse what is on sale right now.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-11 rounded-full px-6 font-medium shadow-soft">
                    <Link href="/events">
                      Browse events
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-full px-6 font-medium"
                  >
                    <Link href="/login">Sign in to your account</Link>
                  </Button>
                </div>
              </div>

              <ul className="flex flex-col gap-4">
                {CONTACT_CHANNELS.map((channel) => (
                  <li
                    key={channel.title}
                    className="flex gap-4 rounded-2xl border border-border/40 bg-background/40 p-5 shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card text-primary">
                      <channel.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        {channel.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {channel.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
