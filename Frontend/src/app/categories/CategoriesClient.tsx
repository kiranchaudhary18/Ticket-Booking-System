"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, SearchX, ShieldAlert } from "lucide-react";
import { eventService } from "@/services/event.service";
import { Category } from "@/types/event";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { CategoryCard, CategoriesGridSkeleton } from "@/components/categories/CategoryCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";

export default function CategoriesClient() {
  const { user, isAuthenticated } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [eventCounts, setEventCounts] = useState<Record<number, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isAuthError: boolean } | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await eventService.getCategories();
      setCategories(data);

      // Event counts come from the events API (`count` for each category).
      const counts = await Promise.all(
        data.map(async (category) => {
          try {
            const response = await eventService.getEvents({
              category: category.id,
              page: 1,
              page_size: 1,
            });
            return [category.id, response.count ?? null] as const;
          } catch {
            return [category.id, null] as const;
          }
        })
      );

      setEventCounts(Object.fromEntries(counts));
    } catch (err: unknown) {
      console.error("Failed to load categories:", err);
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr.response?.status;

      setCategories([]);
      setError({
        isAuthError: false,
        message: "We could not load categories right now. Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  // Category creation is restricted to administrators by the Backend.
  const canCreateCategory = isAuthenticated && user?.role === UserRole.ADMIN;

  return (
    <div className="container mx-auto px-4 py-10 md:px-6 md:py-12">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Browse the catalogue
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Event Categories
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Pick a category to explore every event currently on sale in that space.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && !error && categories.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
              {categories.length} {categories.length === 1 ? "category" : "categories"}
            </p>
          )}
          {canCreateCategory && (
            <Link
              href="/admin/categories"
              className={cn(buttonVariants({ size: "sm" }), "font-medium")}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Create category
            </Link>
          )}
        </div>
      </header>

      {isLoading ? (
        <CategoriesGridSkeleton count={8} />
      ) : error ? (
        <div className="rounded-xl border border-border bg-card">
          <ErrorState
            type="api"
            title="Unable to load categories"
            message={error.message}
            onRetry={fetchCategories}
          />
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No categories available</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Categories will appear here as soon as they are published.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={fetchCategories}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              eventCount={eventCounts[category.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}