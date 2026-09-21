"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, CalendarDays, MapPin, Ticket, Bell, MoreVertical, Edit, Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Event, Show, Venue } from "@/types/organizer-dashboard";
import { useToast } from "@/hooks/use-toast";
import { OrganizerDashboardCards } from "@/components/organizer/OrganizerDashboardCards";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EventStatusBadge } from "@/components/organizer/EventStatusBadge";
import { Badge } from "@/components/ui/badge";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [allEvents, allShows, statsData] = await Promise.all([
        organizerService.getEvents(),
        organizerService.getShows(),
        organizerService.getDashboardStatistics(),
      ]);

      setEvents(allEvents);
      setShows(allShows);
      setStats(statsData);
    } catch (err: unknown) {
      console.error("Failed to load organizer data:", err);
      setError("We encountered an issue while loading your dashboard data. Please try again.");
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server. Please check your network.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState type="api" message={error} onRetry={fetchDashboardData} />;

  const upcomingEventsCount = events.filter(e => e.is_active && new Date(e.end_date) > new Date()).length;
  const recentEvents = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  const upcomingShows = shows
    .filter(s => s.is_active && new Date(`${s.show_date}T${s.start_time}`) > new Date())
    .sort((a, b) => new Date(`${a.show_date}T${a.start_time}`).getTime() - new Date(`${b.show_date}T${b.start_time}`).getTime())
    .slice(0, 4);

  const quickActions = [
    { title: "Create Event", icon: PlusCircle, href: "/organizer/events/create", bg: "bg-indigo-50", text: "text-indigo-600" },
    { title: "Manage Events", icon: CalendarDays, href: "/organizer/events", bg: "bg-emerald-50", text: "text-emerald-600" },
    { title: "Manage Venues", icon: MapPin, href: "/organizer/venues", bg: "bg-blue-50", text: "text-blue-600" },
    { title: "View Bookings", icon: Ticket, href: "/organizer/bookings", bg: "bg-amber-50", text: "text-amber-600" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0B1020]">Welcome back, {user?.name?.split(' ')[0] || "Organizer"}</h1>
          <p className="text-[#667085] mt-1">Manage your events, shows, and ticket sales.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-full border-[#E7E5E0] bg-white text-[#667085] hover:bg-[#F8F7F4]">
            <Bell className="h-5 w-5" />
          </Button>
          <Button asChild className="bg-[#5B5CE2] hover:bg-[#4A4CD0] text-white rounded-[10px] h-10 px-4">
            <Link href="/organizer/events/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Event
            </Link>
          </Button>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.title} href={action.href} className="group block">
              <div className="bg-white border border-[#E7E5E0] rounded-xl p-4 flex items-center gap-3 hover:border-[#5B5CE2]/50 hover:shadow-sm transition-all">
                <div className={`p-2 rounded-lg ${action.bg} ${action.text} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-medium text-[#0B1020]">{action.title}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* STATISTICS */}
      <OrganizerDashboardCards stats={stats} upcoming_events={upcomingEventsCount} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* MY EVENTS */}
        <div className="bg-white rounded-xl border border-[#E7E5E0] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#E7E5E0] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#0B1020]">My Events</h2>
              <p className="text-sm text-[#667085]">Recently created events</p>
            </div>
            <Button variant="ghost" size="sm" className="text-[#5B5CE2] hover:bg-[#5B5CE2]/10" asChild>
              <Link href="/organizer/events">View All</Link>
            </Button>
          </div>
          <div className="p-0">
            {recentEvents.length === 0 ? (
              <div className="p-8">
                <EmptyState 
                  icon={<CalendarDays className="h-12 w-12 text-muted-foreground" />}
                  title="No events yet"
                  message="Create your first event to start selling tickets."
                  actionLabel="Create Event"
                  onAction={() => window.location.href = "/organizer/events/create"}
                />
              </div>
            ) : (
              <div className="divide-y divide-[#E7E5E0]">
                {recentEvents.map((event) => (
                  <div key={event.id} className="p-4 sm:p-6 flex items-center gap-4 hover:bg-[#F8F7F4] transition-colors">
                    <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                      {event.image ? (
                        <Image src={event.image} alt={event.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#F8F7F4] text-[#667085]">
                          <CalendarDays className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <Link href={`/organizer/events/${event.id}`} className="block truncate pr-2 group">
                          <h3 className="font-semibold text-[#0B1020] truncate group-hover:text-[#5B5CE2] transition-colors">
                            {event.title}
                          </h3>
                        </Link>
                        <EventStatusBadge event={event as any} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-[#667085]">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {event.venue_name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3 w-3" /> {event.capacity} cap
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING SHOWS */}
        <div className="bg-white rounded-xl border border-[#E7E5E0] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#E7E5E0] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#0B1020]">Upcoming Shows</h2>
              <p className="text-sm text-[#667085]">Scheduled for the near future</p>
            </div>
          </div>
          <div className="p-0">
            {upcomingShows.length === 0 ? (
              <div className="p-8">
                <EmptyState 
                  icon={<CalendarDays className="h-12 w-12 text-muted-foreground" />}
                  title="No upcoming shows"
                  message="You don't have any upcoming scheduled shows."
                />
              </div>
            ) : (
              <div className="divide-y divide-[#E7E5E0]">
                {upcomingShows.map((show) => {
                  const showDate = new Date(`${show.show_date}T${show.start_time}`);
                  return (
                    <div key={show.id} className="p-4 sm:p-6 flex items-center gap-4 hover:bg-[#F8F7F4] transition-colors">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-[#5B5CE2]/10 text-[#5B5CE2] flex-shrink-0">
                        <span className="text-xs font-bold uppercase">{format(showDate, "MMM")}</span>
                        <span className="text-xl font-bold leading-none">{format(showDate, "dd")}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#0B1020] truncate">{show.event_title}</h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-[#667085]">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" /> {format(showDate, "h:mm a")}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="border-[#C9A86A] text-[#C9A86A] bg-transparent">
                          {show.available_seats !== undefined ? `${show.available_seats} left` : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
