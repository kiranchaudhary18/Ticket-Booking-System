"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  ChevronDown,
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category, Event } from "@/types/event";

/**
 * Editorial photography for the hero artwork. Event artwork is preferred when the
 * organizer uploaded one, otherwise the platform keeps a consistent editorial look.
 */
const HERO_IMAGE =
  "https://images.pexels.com/photos/15324093/pexels-photo-15324093.jpeg?auto=compress&cs=tinysrgb&w=1200";
const HERO_INSET_IMAGE =
  "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg?auto=compress&cs=tinysrgb&w=800";

/** Chips shown until the categories API responds (kept in sync with /events filters). */
const FALLBACK_CHIPS = ["Concerts", "Stand-up comedy", "Theatre", "Sports"];

const EMPTY_VALUE_TEXT = "Tickets available now";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Secure Razorpay checkout" },
  { icon: TicketCheck, label: "Instant QR e-tickets" },
  { icon: BadgeCheck, label: "Verified organizers" },
];

/** Media URLs from the API may be relative, so absolute them before handing to next/image. */
function resolveImageUrl(image: string | null | undefined): string {
  if (!image) return HERO_INSET_IMAGE;
  if (image.startsWith("http")) return image;
  return `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${image}`;
}

interface HomeHeroProps {
  /** Categories power the popular-search chips. */
  categories: Category[];
  /** Most relevant upcoming event, highlighted in the overlapping card. */
  featuredEvent: Event | null;
}

export function HomeHero({ categories, featuredEvent }: HomeHeroProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState("");

  /**
   * The hero search reuses the existing /events query-string contract
   * (search, city, start_date) so no API logic changes are required.
   */
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (city.trim()) params.set("city", city.trim());
    if (date) params.set("start_date", date);

    const search = params.toString();
    router.push(search ? `/events?${search}` : "/events");
  };

  const chips = categories.length
    ? categories.slice(0, 4).map((category) => ({
        label: category.name,
        href: `/events?category=${category.id}`,
      }))
    : FALLBACK_CHIPS.map((label) => ({
        label,
        href: `/events?search=${encodeURIComponent(label)}`,
      }));

  const featuredCategory = featuredEvent
    ? categories.find((category) => String(category.id) === String(featuredEvent.category))?.name
    : undefined;

  const featuredDate = featuredEvent?.start_date ? new Date(featuredEvent.start_date) : null;
  const featuredDateText =
    featuredDate && !Number.isNaN(featuredDate.getTime()) ? dateFormatter.format(featuredDate) : null;

  const highlightHref = featuredEvent ? `/events/${featuredEvent.id}` : "/events";
  const highlightImage = featuredEvent
    ? resolveImageUrl(featuredEvent.event_image)
    : HERO_INSET_IMAGE;
  const highlightTitle = featuredEvent?.title ?? "Hundreds of events on sale";
  const highlightMeta = featuredEvent
    ? [featuredDateText, featuredCategory].filter(Boolean).join(" • ") || EMPTY_VALUE_TEXT
    : "Browse the full line-up";
  const highlightEyebrow = featuredEvent ? "Next up" : "Coming soon";

  return (
    <section className="relative overflow-hidden bg-[#FAF8F5]">
      {/* Warm, barely-there wash that keeps the cream canvas from feeling flat */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(115%_90%_at_12%_0%,rgba(91,92,226,0.05),transparent_58%),radial-gradient(85%_75%_at_88%_6%,rgba(201,168,106,0.1),transparent_60%)]"
      />

      <div className="mx-auto w-full max-w-[1280px] px-6 py-12 md:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[55%_45%] lg:gap-12">
          {/* Left: editorial copy + search */}
          <div className="max-w-xl relative">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c29665]">
              Live events. Real experiences.
            </span>

            <h1 className="mt-4 text-[3.5rem] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#0A1526] sm:text-[4rem]">
              Discover events worth experiencing.
            </h1>

            <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg max-w-[90%]">
              Find and book tickets for concerts, theatre, sports, comedy and experiences happening
              around you.
            </p>

            <form onSubmit={handleSearch} className="mt-9" suppressHydrationWarning>
              <div className="flex flex-col gap-1 rounded-[2rem] border border-border/40 bg-white p-1.5 shadow-md sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-border/50">
                <div className="flex flex-[1.2] items-center gap-2.5 rounded-full px-4 py-2 transition-colors focus-within:bg-slate-50">
                  <Search
                    className="h-4 w-4 shrink-0 text-muted-foreground/70"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <label htmlFor="hero-search" className="sr-only">
                    Search events
                  </label>
                  <Input
                    id="hero-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Events, artists or venues"
                    className="h-9 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    suppressHydrationWarning
                  />
                </div>

                <div className="flex flex-1 items-center gap-2.5 rounded-full px-4 py-2 transition-colors focus-within:bg-slate-50">
                  <MapPin
                    className="h-4 w-4 shrink-0 text-muted-foreground/70"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <label htmlFor="hero-city" className="sr-only">
                    City or venue
                  </label>
                  <Input
                    id="hero-city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Select City"
                    className="h-9 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    suppressHydrationWarning
                  />
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                </div>

                <div className="flex flex-1 items-center gap-2.5 rounded-full px-4 py-2 transition-colors focus-within:bg-slate-50">
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-muted-foreground/70"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <label htmlFor="hero-date" className="sr-only">
                    Date
                  </label>
                  <Input
                    id="hero-date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    placeholder="Select Date"
                    className="h-9 border-0 bg-transparent p-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                    suppressHydrationWarning
                  />
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-[44px] shrink-0 rounded-full bg-[#3B41C5] px-7 text-sm font-medium text-white shadow-sm hover:bg-[#3B41C5]/90 sm:ml-2 flex items-center gap-1.5"
                  suppressHydrationWarning
                >
                  Find Events
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </form>

            {/* Popular search chips */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2.5">
              <span className="text-[11px] font-semibold text-slate-700">
                Popular searches:
              </span>
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="rounded-full bg-[#F3F4F6] px-3.5 py-1 text-[11px] font-semibold text-slate-500 transition-colors duration-200 hover:bg-slate-200 hover:text-slate-800"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <ul className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border/70 pt-6">
              {TRUST_POINTS.map((point) => (
                <li
                  key={point.label}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
                >
                  <point.icon
                    className="h-4 w-4 text-accent"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {point.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: hero photography with an overlapping featured-event card */}
          <div className="relative mx-auto w-full pr-4 lg:pr-8 flex justify-end">
            
            {/* Decorative script text on the left of the image */}
            <div className="absolute -left-12 top-10 z-10 hidden rotate-[-5deg] text-xl font-medium italic text-[#958172] sm:block lg:-left-20 font-serif leading-tight">
              Music<br />
              Arts<br />
              Sports<br />
              Comedy<br />
              More...
              <svg className="absolute -bottom-4 -right-10 h-8 w-8 -rotate-[20deg] text-[#958172]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            <div className="relative aspect-[16/10] w-full max-w-[550px] overflow-hidden rounded-[2.5rem] border border-border/30 bg-muted shadow-sm lg:rounded-[3rem]">
              <Image
                src={HERO_IMAGE}
                alt="Musicians performing on a lit stage in front of a live audience"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/60 via-transparent to-transparent"
              />
              
              {/* Text inside the top right of the main image */}
              <div className="absolute right-6 top-8 text-right lg:right-10 lg:top-10">
                <p className="text-xl font-medium leading-tight text-white/90 lg:text-2xl">
                  Good<br />
                  Events<br />
                  <span className="font-bold text-white">Brighter<br />People</span>
                </p>
                <div className="mt-2 ml-auto h-0.5 w-16 bg-[#c29665]" />
              </div>
            </div>
            
            {/* Bottom right floating cards (two overlapping cards) */}
            <div className="absolute -bottom-10 -right-2 flex items-end sm:-right-4 lg:-right-6 z-20">
              
              {/* Card 1 (Gold/Cream) */}
              <div className="relative -mr-6 mb-4 z-10 flex h-36 w-28 flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-[#FDEED3] p-4 shadow-lg lg:h-40 lg:w-32">
                <Star className="h-6 w-6 text-[#C29665]" strokeWidth={2} />
                <p className="text-center text-sm font-bold leading-tight text-[#4A3D2F]">
                  Live<br />Create<br />Belong
                </p>
              </div>

              {/* Card 2 (Blue/Image) */}
              <Link
                href={highlightHref}
                className="group relative z-20 h-44 w-44 overflow-hidden rounded-[1.5rem] border-[3px] border-white bg-muted shadow-xl transition-transform duration-300 hover:-translate-y-1 lg:h-48 lg:w-48"
              >
                <Image
                  src={highlightImage}
                  alt={featuredEvent ? featuredEvent.title : "Featured Event"}
                  fill
                  sizes="200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}