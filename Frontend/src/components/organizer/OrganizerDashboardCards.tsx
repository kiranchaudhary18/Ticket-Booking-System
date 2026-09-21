import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CalendarClock, Ticket, IndianRupee, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  total_events: number;
  total_bookings: number;
  total_revenue: number;
  tickets_sold: number;
}

interface OrganizerDashboardCardsProps {
  stats: Stats | null;
  upcoming_events: number;
}

export function OrganizerDashboardCards({ stats, upcoming_events }: OrganizerDashboardCardsProps) {
  if (!stats) return null;

  const statItems = [
    {
      title: "Total Events",
      value: stats.total_events,
      icon: CalendarDays,
      description: "All events created",
      iconClassName: "text-indigo-500 bg-indigo-50",
    },
    {
      title: "Upcoming Events",
      value: upcoming_events,
      icon: CalendarClock,
      description: "Active and in the future",
      iconClassName: "text-blue-500 bg-blue-50",
    },
    {
      title: "Total Bookings",
      value: stats.total_bookings,
      icon: Ticket,
      description: "Across all events",
      iconClassName: "text-amber-600 bg-amber-50",
    },
    {
      title: "Tickets Sold",
      value: stats.tickets_sold,
      icon: Users,
      description: "Successfully purchased",
      iconClassName: "text-emerald-500 bg-emerald-50",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.total_revenue.toLocaleString()}`,
      icon: IndianRupee,
      description: "From confirmed bookings",
      iconClassName: "text-violet-500 bg-violet-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="border-[#E7E5E0] shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-[#667085]">{item.title}</p>
                  <p className="text-2xl font-bold text-[#0B1020] mt-1">{item.value}</p>
                </div>
                <div className={cn("p-2 rounded-[10px]", item.iconClassName)}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#E7E5E0]/50">
                <p className="text-xs font-medium text-[#667085]">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
