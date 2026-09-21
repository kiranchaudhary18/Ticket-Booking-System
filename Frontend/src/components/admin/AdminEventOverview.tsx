"use client";

import { format } from "date-fns";
import { CalendarDays, ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminDashboardStatistics, AdminEventListResponse } from "@/types/admin";
import { Event } from "@/types/event";

interface AdminEventOverviewProps {
  stats: AdminDashboardStatistics;
  recentEvents: AdminEventListResponse | null;
}

export function AdminEventOverview({ stats, recentEvents }: AdminEventOverviewProps) {
  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "DRAFT":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  const topEvents = stats.revenue.event_wise.slice(0, 3);

  return (
    <Card className="border shadow-sm flex flex-col h-full bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            Events Overview
          </CardTitle>
          <CardDescription>Top performers and latest events created</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 pt-4">
        
        {/* Top Events Section */}
        {topEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 flex items-center mb-3">
              <Trophy className="h-4 w-4 mr-2 text-amber-500" /> Top Performing Events
            </h4>
            <div className="space-y-3">
              {topEvents.map((topEvent) => (
                <div key={topEvent.event_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex-1 truncate pr-4">
                    <p className="text-sm font-medium text-slate-800 truncate" title={topEvent.event_title}>{topEvent.event_title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{topEvent.tickets_sold} Tickets Sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">₹{topEvent.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Events List */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Events</h4>
          {!recentEvents || recentEvents.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-slate-100 border-dashed">
              <CalendarDays className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No Recent Events</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b border-slate-100">
                  {recentEvents.results.slice(0, 5).map((event: Event) => (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700 max-w-[200px] truncate" title={event.title}>{event.title}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(event.start_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`${getEventStatusColor(event.status)} text-[10px] font-semibold border-0 rounded-sm px-2`} variant="outline">
                          {event.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t mt-auto">
        <Button variant="ghost" className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" asChild>
          <Link href="/admin/events">
            View All Events <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
