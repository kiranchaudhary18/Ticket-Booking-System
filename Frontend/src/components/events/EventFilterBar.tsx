"use client";

import { useState } from "react";
import { CalendarRange, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/types/event";

/** Value used by the events API to mean "no filter applied". */
export const ALL_VALUE = "all";

/** Sort modes supported by the events API (`sort` query parameter). */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "event_date_asc", label: "Event date (soonest)" },
  { value: "event_date_desc", label: "Event date (latest)" },
  { value: "title_asc", label: "Title (A-Z)" },
  { value: "title_desc", label: "Title (Z-A)" },
] as const;

export interface EventFilterValues {
  search: string;
  category: string;
  city: string;
  state: string;
  language: string;
  dateFrom: string;
  dateTo: string;
  sort: string;
}

export const EMPTY_FILTERS: EventFilterValues = {
  search: "",
  category: ALL_VALUE,
  city: ALL_VALUE,
  state: ALL_VALUE,
  language: ALL_VALUE,
  dateFrom: "",
  dateTo: "",
  sort: "newest",
};

interface EventFilterBarProps {
  values: EventFilterValues;
  /** Applies a partial change. Filters apply instantly; search applies on submit. */
  onChange: (patch: Partial<EventFilterValues>) => void;
  onSubmit: () => void;
  onClear: () => void;
  categories: Category[];
  cities: string[];
  states: string[];
  languages: string[];
  isLoading?: boolean;
  activeFilterCount: number;
}

export function EventFilterBar({
  values,
  onChange,
  onSubmit,
  onClear,
  categories,
  cities,
  states,
  languages,
  isLoading = false,
  activeFilterCount,
}: EventFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="rounded-2xl border border-slate-100 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Label htmlFor="event-search" className="sr-only">
            Search events
          </Label>
          <Input
            id="event-search"
            type="search"
            value={values.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Search events, artists, or venues..."
            className="h-12 pl-11 pr-10 border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-[#3B41C5]"
          />
          {values.search && (
            <button
              type="button"
              onClick={() => onChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700"
              aria-label="Clear search text"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 justify-center gap-2 sm:flex-none rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#3B41C5] px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          <Button type="submit" className="h-12 flex-1 justify-center sm:flex-none rounded-xl bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-semibold px-6 shadow-md shadow-[#3B41C5]/20" disabled={isLoading}>
            Search
          </Button>
        </div>
      </div>
    {isExpanded && (
        <div className="border-t border-border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-category">Category</Label>
              <Select
                value={values.category}
                onValueChange={(value) => onChange({ category: value || ALL_VALUE })}
              >
                <SelectTrigger id="filter-category" className="h-10 w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-city">City</Label>
              <Select
                value={values.city}
                onValueChange={(value) => onChange({ city: value || ALL_VALUE })}
              >
                <SelectTrigger id="filter-city" className="h-10 w-full">
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All cities</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-state">State</Label>
              <Select
                value={values.state}
                onValueChange={(value) => onChange({ state: value || ALL_VALUE })}
              >
                <SelectTrigger id="filter-state" className="h-10 w-full">
                  <SelectValue placeholder="All states" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All states</SelectItem>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-language">Language</Label>
              <Select
                value={values.language}
                onValueChange={(value) => onChange({ language: value || ALL_VALUE })}
              >
                <SelectTrigger id="filter-language" className="h-10 w-full">
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All languages</SelectItem>
                  {languages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-date-from">From date</Label>
              <Input
                id="filter-date-from"
                type="date"
                value={values.dateFrom}
                onChange={(event) => onChange({ dateFrom: event.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-date-to">Until date</Label>
              <Input
                id="filter-date-to"
                type="date"
                value={values.dateTo}
                onChange={(event) => onChange({ dateTo: event.target.value })}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-sort">Sort by</Label>
              <Select
                value={values.sort}
                onValueChange={(value) => onChange({ sort: value || "newest" })}
              >
                <SelectTrigger id="filter-sort" className="h-10 w-full">
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                onClick={onClear}
                className="h-10 w-full justify-center text-muted-foreground hover:text-foreground sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" aria-hidden="true" />
                Clear all filters
              </Button>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            Date filters match events starting on or after the first date and ending on or before the second.
          </p>
        </div>
      )}
    </form>
  );
}