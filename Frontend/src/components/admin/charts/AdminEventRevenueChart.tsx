"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface AdminEventRevenueChartProps {
  data: Array<{
    event_id: number;
    event_title: string;
    revenue: number;
    tickets_sold: number;
  }> | undefined;
}

export function AdminEventRevenueChart({ data }: AdminEventRevenueChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    // Take top 10 events
    return data.slice(0, 10).map(item => ({
      name: item.event_title.length > 20 ? item.event_title.substring(0, 20) + "..." : item.event_title,
      revenue: item.revenue,
      tickets: item.tickets_sold
    }));
  }, [data]);

  return (
    <Card className="border shadow-sm col-span-1 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top Grossing Events
        </CardTitle>
        <CardDescription>
          Highest earning events on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `₹${value}`}
                  dx={-10}
                />
                <Tooltip 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [
                    name === 'revenue' ? `₹${Number(value).toLocaleString()}` : value, 
                    name === 'revenue' ? "Revenue" : "Tickets Sold"
                  ]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={50} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] border border-dashed rounded-md bg-muted/20 text-muted-foreground">
            <TrendingUp className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="font-medium">No event data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
