"use client";

import { format } from "date-fns";
import { CreditCard, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminDashboardStatistics, AdminBookingListResponse } from "@/types/admin";

interface AdminBookingOverviewProps {
  stats: AdminDashboardStatistics;
  recentBookings: AdminBookingListResponse | null;
}

export function AdminBookingOverview({ stats, recentBookings }: AdminBookingOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
      case "SUCCESS":
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "PENDING":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      case "CANCELLED":
      case "REFUNDED":
      case "FAILED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <Card className="border shadow-sm flex flex-col h-full bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <CreditCard className="h-5 w-5 text-indigo-600" />
            Recent Bookings
          </CardTitle>
          <CardDescription>Latest booking activities and their status</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6 pt-4">
        {!recentBookings || recentBookings.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
            <CreditCard className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
            <h3 className="text-base font-medium">No Recent Bookings</h3>
            <p className="text-sm text-muted-foreground mt-1">Bookings will appear here once customers make purchases.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Show Date</th>
                  <th className="px-4 py-3 font-semibold text-center">Seats</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b border-slate-100">
                {recentBookings.results.slice(0, 5).map((booking) => {
                  const showData = booking.show as Record<string, unknown>;
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700">{booking.booking_reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{booking.customer?.first_name} {booking.customer?.last_name}</div>
                        <div className="text-xs text-muted-foreground">{booking.customer?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 max-w-[150px] truncate" title={booking.event?.title}>
                        {booking.event?.title || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {showData?.show_date ? format(new Date(showData.show_date as string), "MMM d, yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">
                        {booking.seats ? booking.seats.length : 0}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        ₹{booking.total_amount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`${getStatusColor(booking.status)} text-[10px] font-semibold border-0 rounded-sm px-2`} variant="outline">
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {format(new Date(booking.created_at), "MMM d, HH:mm")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2 border-t mt-auto">
        <Button variant="ghost" className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" asChild>
          <Link href="/admin/bookings">
            View All Bookings <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
