"use client";

import React, { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarX, ChevronLeft, ChevronRight, X } from "lucide-react";
import { eventService } from "@/services/event.service";
import { pricingService } from "@/services/pricing.service";
import { Category, Event, EventFilterParams, Venue } from "@/types/event";
import { EventCard } from "@/components/events/EventCard";
import { EventsGridSkeleton } from "@/components/events/EventCardSkeleton";
import {
  ALL_VALUE,
  EMPTY_FILTERS,
  EventFilterBar,
  EventFilterValues,
} from "@/components/events/EventFilterBar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PageSkeleton } from "@/components/common/PageSkeleton";

const PAGE_SIZE = 9;

/** Reads the supported event filters from the URL (single source of truth). */
function readFilters(params: URLSearchParams): EventFilterValues {
  return {
    search: params.get("search") || "",
    category: params.get("category") || ALL_VALUE,
    city: params.get("city") || ALL_VALUE,
    state: params.get("state") || ALL_VALUE,
    language: params.get("language") || ALL_VALUE,
    dateFrom: params.get("start_date") || "",
    dateTo: params.get("end_date") || "",
    sort: params.get("sort") || "newest",
  };
}

/** Serialises filter values back into a query string. */
function buildQuery(values: EventFilterValues, page: number): string {
  const params = new URLSearchParams();

  if (values.search.trim()) params.set("search", values.search.trim());
  if (values.category && values.category !== ALL_VALUE) params.set("category", values.category);
  if (values.city && values.city !== ALL_VALUE) params.set("city", values.city);
  if (values.state && values.state !== ALL_VALUE) params.set("state", values.state);
  if (values.language && values.language !== ALL_VALUE) params.set("language", values.language);
  if (values.dateFrom) params.set("start_date", values.dateFrom);
  if (values.dateTo) params.set("end_date", values.dateTo);
  if (values.sort && values.sort !== "newest") params.set("sort", values.sort);
  if (page > 1) params.set("page", String(page));

  return params.toString();
}

/** Reset values used when a single filter pill is removed. */
const RESET_VALUES: EventFilterValues = { ...EMPTY_FILTERS };

function EventsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [startingPrices, setStartingPrices] = useState<Record<number, number | null>>({});

  const [filterValues, setFilterValues] = useState<EventFilterValues>(() =>
    readFilters(searchParams)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isAuthError: boolean } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  // Keep the form fields in sync with the URL (back / forward, deep links)
  useEffect(() => {
    const next = readFilters(searchParams);
    Promise.resolve().then(() => setFilterValues(next));
  }, [searchParams]);
// Lookup data for the filter controls (categories, cities, states, languages)
  useEffect(() => {
    let cancelled = false;

    const loadLookups = async () => {
      const [categoriesResult, venuesResult, facetsResult] = await Promise.allSettled([
        eventService.getCategories(),
        eventService.getVenues(),
        // Facet values are derived from the events the current user can see.
        eventService.getEvents({ page: 1, page_size: 50 }),
      ]);

      if (cancelled) return;

      if (categoriesResult.status === "fulfilled") {
        setCategories(categoriesResult.value);
      }
      if (venuesResult.status === "fulfilled") {
        setVenues(venuesResult.value);
      }
      if (facetsResult.status === "fulfilled") {
        const uniqueLanguages = Array.from(
          new Set(
            (facetsResult.value.results || [])
              .map((event) => event.language)
              .filter((language): language is string => !!language && language.trim() !== "")
          )
        ).sort((a, b) => a.localeCompare(b));

        setLanguages(uniqueLanguages);
      }
    };

    loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: EventFilterParams = { page, page_size: PAGE_SIZE };

      const search = searchParams.get("search");
      const category = searchParams.get("category");
      const city = searchParams.get("city");
      const state = searchParams.get("state");
      const language = searchParams.get("language");
      const startDate = searchParams.get("start_date");
      const endDate = searchParams.get("end_date");
      const sort = searchParams.get("sort");

      if (search?.trim()) params.search = search.trim();
      if (category && category !== ALL_VALUE) params.category = Number(category);
      if (city && city !== ALL_VALUE) params.city = city;
      if (state && state !== ALL_VALUE) params.state = state;
      if (language && language !== ALL_VALUE) params.language = language;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (sort) params.sort = sort as EventFilterParams["sort"];

      const response = await eventService.getEvents(params);
      const results = response.results || [];
      const count = response.count ?? results.length;

      setEvents(results);
      setTotalCount(count);
      setTotalPages(Math.max(1, Math.ceil(count / PAGE_SIZE)));
      setHasNext(!!response.next);
      setHasPrev(!!response.previous);

      // Starting prices are supplementary: resolve them after the grid renders.
      const venueIds = Array.from(new Set(results.map((event) => event.venue)));
      pricingService
        .getStartingPricesForVenues(venueIds)
        .then((prices) => setStartingPrices((previous) => ({ ...previous, ...prices })))
        .catch(() => undefined);
    } catch (err: unknown) {
      console.error("Failed to load events:", err);
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr.response?.status;

      setEvents([]);
      setTotalCount(0);
      setError({
        isAuthError: false,
        message: "We could not load events right now. Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, searchParams]);

  // Refetch whenever the URL filters / page change
  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const cities = useMemo(
    () =>
      Array.from(new Set(venues.map((venue) => venue.city).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [venues]
  );

  const states = useMemo(
    () =>
      Array.from(new Set(venues.map((venue) => venue.state).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [venues]
  );
  const pushUrl = (values: EventFilterValues, pageNumber: number) => {
    const query = buildQuery(values, pageNumber);
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleFilterChange = (patch: Partial<EventFilterValues>) => {
    const next = { ...filterValues, ...patch };
    setFilterValues(next);

    // Free-text search is applied on submit, every other filter applies instantly.
    const changedKeys = Object.keys(patch);
    if (changedKeys.length === 1 && changedKeys[0] === "search") return;

    pushUrl(next, 1);
  };

  const handleSubmit = () => {
    pushUrl(filterValues, 1);
  };

  const handleClear = () => {
    setFilterValues(EMPTY_FILTERS);
    router.push(pathname);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    pushUrl(filterValues, nextPage);
  };

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: keyof EventFilterValues; label: string; value: string }> = [];

    const values = readFilters(searchParams);

    if (values.search) chips.push({ key: "search", label: "Search", value: values.search });
    if (values.category !== ALL_VALUE) {
      const match = categories.find((category) => String(category.id) === values.category);
      chips.push({ key: "category", label: "Category", value: match?.name || values.category });
    }
    if (values.city !== ALL_VALUE) chips.push({ key: "city", label: "City", value: values.city });
    if (values.state !== ALL_VALUE) chips.push({ key: "state", label: "State", value: values.state });
    if (values.language !== ALL_VALUE) {
      chips.push({ key: "language", label: "Language", value: values.language });
    }
    if (values.dateFrom) chips.push({ key: "dateFrom", label: "From", value: values.dateFrom });
    if (values.dateTo) chips.push({ key: "dateTo", label: "Until", value: values.dateTo });

    return chips;
  }, [searchParams, categories]);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:py-10">
      {/* Page heading */}
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase text-[#c29665] mb-2">
            Event discovery
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#0A1526]">
            Discover Events
          </h1>
          <p className="mt-4 text-base md:text-lg text-slate-500">
            Browse concerts, theatre, comedy and live experiences, then choose the show that suits you.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-400 md:text-right" aria-live="polite">
          {isLoading
            ? "Searching events…"
            : error
              ? "Results unavailable"
              : `${totalCount} ${totalCount === 1 ? "event" : "events"} found`}
        </p>
      </header>

      {/* Search + filters */}
      <EventFilterBar
        values={filterValues}
        onChange={handleFilterChange}
        onSubmit={handleSubmit}
        onClear={handleClear}
        categories={categories}
        cities={cities}
        states={states}
        languages={languages}
        isLoading={isLoading}
        activeFilterCount={activeFilters.length}
      />

      {/* Active filter pills */}
      {activeFilters.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Active filters
          </span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                const next: EventFilterValues = {
                  ...filterValues,
                  [filter.key]: RESET_VALUES[filter.key],
                };
                setFilterValues(next);
                pushUrl(next, 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3B41C5]/20 bg-[#EEF2FF] px-3.5 py-1.5 text-xs font-semibold text-[#3B41C5] transition-colors hover:bg-[#3B41C5] hover:text-white group"
            >
              <span className="opacity-70 group-hover:opacity-100">{filter.label}:</span>
              {filter.value}
              <X className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" aria-hidden="true" />
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 px-3 text-xs font-medium text-slate-500 hover:text-[#0A1526]"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results */}
      <div className="mt-8">
        {isLoading ? (
          <EventsGridSkeleton count={PAGE_SIZE} />
        ) : error ? (
          <div className="rounded-xl border border-border bg-card">
            <ErrorState
              type="api"
              title="Unable to load events"
              message={error.message}
              onRetry={fetchEvents}
            />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6 py-16 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#3B41C5]">
              <CalendarX className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-[#0A1526]">No events found</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-500">
              Nothing matches your current search and filters. Try different keywords or reset the
              filters to see everything that is on sale.
            </p>
            <Button size="lg" className="mt-8 rounded-xl bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-semibold shadow-md shadow-[#3B41C5]/20" onClick={handleClear}>
              <X className="mr-2 h-5 w-5" aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between text-sm text-slate-500">
              <p>
                Showing <span className="font-semibold text-[#0A1526]">{rangeStart}</span>–
                <span className="font-semibold text-[#0A1526]">{rangeEnd}</span> of{" "}
                <span className="font-semibold text-[#0A1526]">{totalCount}</span>{" "}
                {totalCount === 1 ? "event" : "events"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  category={categories.find((category) => category.id === event.category)}
                  venue={venues.find((venue) => venue.id === event.venue)}
                  startingPrice={startingPrices[event.venue] ?? null}
                  priority={index < 3}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-center gap-3"
                aria-label="Event pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!hasPrev || isLoading}
                >
                  <ChevronLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!hasNext || isLoading}
                >
                  Next
                  <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EventsContent />
    </Suspense>
  );
}
