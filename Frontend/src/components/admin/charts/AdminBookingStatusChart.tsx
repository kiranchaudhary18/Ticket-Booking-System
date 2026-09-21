"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookmarkIcon } from "lucide-react";
import { AdminDashboardStatistics } from "@/types/admin";

interface AdminBookingStatusChartProps {
  data: AdminDashboardStatistics | null | undefined;
}

const COLORS = {
  confirmed: "hsl(var(--primary))",
  pending: "hsl(var(--chart-3))", // Usually a yellowish/amber color
  cancelled: "hsl(var(--destructive))"
};

export function AdminBookingStatusChart({ data }: AdminBookingStatusChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return [
      { name: "Confirmed", value: data.bookings.confirmed, color: COLORS.confirmed },
      { name: "Pending", value: data.bookings.pending, color: COLORS.pending },
      { name: "Cancelled", value: data.bookings.cancelled, color: COLORS.cancelled },
    ].filter(item => item.value > 0); // Only show statuses that have bookings
  }, [data]);

  return (
    <Card className="border shadow-sm col-span-1 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookmarkIcon className="h-5 w-5 text-primary" />
          Booking Status Distribution
        </CardTitle>
        <CardDescription>
          Overview of booking states across all events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [value, "Bookings"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] border border-dashed rounded-md bg-muted/20 text-muted-foreground">
            <BookmarkIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="font-medium">No booking data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
