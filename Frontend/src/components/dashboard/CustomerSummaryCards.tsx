import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { CustomerDashboardStats } from "@/types/customer-dashboard";

interface CustomerSummaryCardsProps {
  stats: CustomerDashboardStats;
}

export function CustomerSummaryCards({ stats }: CustomerSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-white border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] rounded-[1.25rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-500">Total Bookings</CardTitle>
          <div className="h-9 w-9 bg-slate-50 rounded-xl flex items-center justify-center">
            <Ticket className="h-4 w-4 text-slate-700" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#0A1526]">{stats.totalBookings}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] rounded-[1.25rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-500">Upcoming</CardTitle>
          <div className="h-9 w-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
            <Calendar className="h-4 w-4 text-[#3B41C5]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#0A1526]">{stats.upcomingBookingsCount}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] rounded-[1.25rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-500">Completed</CardTitle>
          <div className="h-9 w-9 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#0A1526]">{stats.completedBookingsCount}</div>
        </CardContent>
      </Card>
      
      <Card className="bg-white border-slate-200/60 shadow-[0_2px_12px_rgb(0,0,0,0.04)] rounded-[1.25rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-500">Cancelled</CardTitle>
          <div className="h-9 w-9 bg-red-50 rounded-xl flex items-center justify-center">
            <XCircle className="h-4 w-4 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-[#0A1526]">{stats.cancelledBookingsCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
