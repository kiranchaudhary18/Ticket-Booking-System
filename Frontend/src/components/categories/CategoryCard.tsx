import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Film,
  GraduationCap,
  Laugh,
  Mic,
  Music,
  Palette,
  Presentation,
  Theater,
  Trophy,
} from "lucide-react";
import { Category } from "@/types/event";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Maps a category name to a professional outline icon.
 * The Backend does not provide icons, so this is presentation metadata only.
 */
function getCategoryIcon(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("music") || normalized.includes("concert")) return Music;
  if (normalized.includes("comedy") || normalized.includes("standup")) return Laugh;
  if (normalized.includes("theater") || normalized.includes("theatre") || normalized.includes("play")) return Theater;
  if (normalized.includes("film") || normalized.includes("cinema") || normalized.includes("movie")) return Film;
  if (normalized.includes("sport") || normalized.includes("game") || normalized.includes("match")) return Trophy;
  if (normalized.includes("festival") || normalized.includes("art") || normalized.includes("culture")) return Palette;
  if (normalized.includes("conference") || normalized.includes("business") || normalized.includes("tech")) return Presentation;
  if (normalized.includes("workshop") || normalized.includes("class") || normalized.includes("seminar")) return GraduationCap;
  if (normalized.includes("book") || normalized.includes("literature") || normalized.includes("poetry")) return BookOpen;
  if (normalized.includes("dj") || normalized.includes("nightlife") || normalized.includes("open mic")) return Mic;
  if (normalized.includes("expo") || normalized.includes("trade") || normalized.includes("market")) return Briefcase;

  return CalendarDays;
}

interface CategoryCardProps {
  category: Category;
  /** Number of events in this category (null when unavailable). */
  eventCount?: number | null;
}

export function CategoryCard({ category, eventCount = null }: CategoryCardProps) {
  const Icon = getCategoryIcon(category.name);

  return (
    <Link
      href={`/events?category=${category.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
        </span>
        <ArrowUpRight
          className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>

      <h2 className="mt-5 text-base font-semibold tracking-tight text-foreground group-hover:text-primary">
        {category.name}
      </h2>

      {category.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
      )}

      <div className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-medium text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        {eventCount === null
          ? "Browse events"
          : `${eventCount} ${eventCount === 1 ? "event" : "events"}`}
      </div>
    </Link>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-soft">
      <Skeleton className="h-11 w-11 rounded-lg" />
      <Skeleton className="mt-5 h-5 w-2/3" />
      <div className="mt-2 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="mt-auto h-4 w-24" />
    </div>
  );
}

export function CategoriesGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <CategoryCardSkeleton key={index} />
      ))}
    </div>
  );
}