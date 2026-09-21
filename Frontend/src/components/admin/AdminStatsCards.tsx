import { 
  Users, 
  CalendarDays, 
  Ticket, 
  CreditCard,
  TrendingUp,
  XCircle,
  UserCheck,
  UserCog
} from "lucide-react";
import { AdminDashboardStatistics } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminStatsCardsProps {
  stats: AdminDashboardStatistics;
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Users */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
          <div className="p-2 bg-blue-50 text-blue-600 rounded-full dark:bg-blue-900/20 dark:text-blue-400">
            <Users className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.overview.users}</div>
          <p className="text-xs text-muted-foreground mt-1">Platform registered users</p>
        </CardContent>
      </Card>

      {/* 2. Total Organizers */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Organizers</CardTitle>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full dark:bg-indigo-900/20 dark:text-indigo-400">
            <UserCog className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.overview.organizers}</div>
          <p className="text-xs text-muted-foreground mt-1">Active event creators</p>
        </CardContent>
      </Card>

      {/* 3. Total Customers */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Customers</CardTitle>
          <div className="p-2 bg-cyan-50 text-cyan-600 rounded-full dark:bg-cyan-900/20 dark:text-cyan-400">
            <UserCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.overview.customers}</div>
          <p className="text-xs text-muted-foreground mt-1">Ticket buyers</p>
        </CardContent>
      </Card>

      {/* 4. Total Events */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Events</CardTitle>
          <div className="p-2 bg-purple-50 text-purple-600 rounded-full dark:bg-purple-900/20 dark:text-purple-400">
            <CalendarDays className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.overview.events}</div>
          <p className="text-xs text-muted-foreground mt-1">Events created on platform</p>
        </CardContent>
      </Card>

      {/* 5. Total Bookings */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Bookings</CardTitle>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-full dark:bg-amber-900/20 dark:text-amber-400">
            <CreditCard className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.overview.bookings}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-green-600 font-medium">{stats.bookings.confirmed}</span> Confirmed &bull; <span className="text-amber-600 font-medium">{stats.bookings.pending}</span> Pending
          </p>
        </CardContent>
      </Card>

      {/* 6. Total Tickets Sold */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Tickets Sold</CardTitle>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full dark:bg-emerald-900/20 dark:text-emerald-400">
            <Ticket className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.overview.tickets}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="text-emerald-600 font-medium">{stats.tickets.active}</span> Active &bull; <span className="text-blue-600 font-medium">{stats.tickets.used}</span> Used
          </p>
        </CardContent>
      </Card>

      {/* 7. Total Revenue */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
          <div className="p-2 bg-green-50 text-green-600 rounded-full dark:bg-green-900/20 dark:text-green-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">₹{stats.revenue.total}</div>
          <p className="text-xs text-muted-foreground mt-1">From successful payments</p>
        </CardContent>
      </Card>

      {/* 8. Cancelled Tickets */}
      <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">Cancelled Tickets</CardTitle>
          <div className="p-2 bg-red-50 text-red-600 rounded-full dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">{stats.tickets.cancelled || 0}</div>
          <p className="text-xs text-muted-foreground mt-1 text-red-600/80">Tickets cancelled/refunded</p>
        </CardContent>
      </Card>
    </div>
  );
}
