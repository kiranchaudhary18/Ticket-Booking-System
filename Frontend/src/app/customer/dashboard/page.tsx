"use client";

import { useEffect, useState } from "react";
import { customerDashboardService } from "@/services/customer-dashboard.service";
import { eventService } from "@/services/event.service";
import { CustomerDashboardData } from "@/types/customer-dashboard";
import { Event, Category } from "@/types/event";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FeaturedEventHero } from "@/components/dashboard/FeaturedEventHero";
import { CustomerHeroSearch } from "@/components/dashboard/CustomerHeroSearch";
import { CategoryIconList } from "@/components/dashboard/CategoryIconList";
import { CompactBookingBanner } from "@/components/dashboard/CompactBookingBanner";
import { EventHorizontalScroll } from "@/components/dashboard/EventHorizontalScroll";

export default function CustomerDashboardPage() {
  const [dashboardData, setDashboardData] = useState<CustomerDashboardData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        // Fetch all required data in parallel
        const [dashData, eventsData, categoriesData] = await Promise.all([
          customerDashboardService.getDashboardData().catch(e => {
            console.error("Failed to load dashboard data", e);
            return null; // Don't fail the whole page if just bookings fail
          }),
          eventService.getEvents({ page_size: 20 }).catch(e => {
            console.error("Failed to load events", e);
            return { results: [] };
          }),
          eventService.getCategories().catch(e => {
            console.error("Failed to load categories", e);
            return [];
          })
        ]);

        setDashboardData(dashData || null);
        
        let finalEvents: Event[] = [];
        if (Array.isArray(eventsData)) {
          finalEvents = eventsData;
        } else if (eventsData && Array.isArray(eventsData.results)) {
          finalEvents = eventsData.results;
        }
        setEvents(finalEvents);
        
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err: any) {
        console.error("Failed to load page data:", err);
        setError(err?.message || "An unexpected error occurred while fetching your data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error && events.length === 0) {
    return (
      <ErrorState 
        type="api"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const upcomingBookings = dashboardData?.upcomingBookings || [];
  const nextUpcoming = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  // Simple logic to divide fetched events for the UI presentation
  // In a real app, these would be separate API queries (e.g. popular, upcoming, past)
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_date) >= now);
  const pastEvents = events.filter(e => new Date(e.start_date) < now);
  
  // Create a mock "Popular" events array just to make the UI look rich
  const popularEvents = [...upcomingEvents].sort(() => 0.5 - Math.random()).slice(0, 6);
  
  // The featured event will be the first popular event
  const featuredEvent = popularEvents.length > 0 ? popularEvents[0] : null;

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      
      {/* Featured Event Hero */}
      <FeaturedEventHero event={featuredEvent} />

      {/* Search Bar */}
      <CustomerHeroSearch />

      {/* Categories */}
      <CategoryIconList categories={categories} />

      {/* Upcoming Booking Banner */}
      <CompactBookingBanner booking={nextUpcoming} />

      {/* Popular Events */}
      <EventHorizontalScroll 
        title="Popular Events" 
        events={popularEvents} 
        viewAllLink="/events"
      />

      {/* Upcoming Events */}
      <EventHorizontalScroll 
        title="Upcoming Events" 
        events={upcomingEvents} 
        viewAllLink="/events?sort=event_date_asc"
      />

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <EventHorizontalScroll 
          title="Past Events" 
          events={pastEvents} 
        />
      )}

    </div>
  );
}
