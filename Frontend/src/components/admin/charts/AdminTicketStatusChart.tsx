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
import { Ticket as TicketIcon } from "lucide-react";
import { AdminTicketReport } from "@/types/admin";

interface AdminTicketStatusChartProps {
  data: AdminTicketReport | null | undefined;
}

const COLORS = {
  active: "hsl(var(--primary))",
  used: "hsl(var(--muted-foreground))",
  cancelled: "hsl(var(--destructive))"
};

export function AdminTicketStatusChart({ data }: AdminTicketStatusChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return [
      { name: "Active", value: data.active_tickets, color: COLORS.active },
      { name: "Used", value: data.used_tickets, color: COLORS.used },
      { name: "Cancelled", value: data.cancelled_tickets, color: COLORS.cancelled },
    ].filter(item => item.value > 0); // Only show statuses that have tickets
  }, [data]);

  return (
    <Card className="border shadow-sm col-span-1 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5 text-primary" />
          Ticket Status Distribution
        </CardTitle>
        <CardDescription>
          Overview of ticket states across all events.
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
                  formatter={(value: any) => [value, "Tickets"]}
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
            <TicketIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="font-medium">No ticket data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
