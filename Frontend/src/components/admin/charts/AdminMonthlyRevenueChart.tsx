"use client";

import { useMemo } from "react";
import { format, parseISO, subMonths, startOfMonth, eachMonthOfInterval } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface AdminMonthlyRevenueChartProps {
  data: Array<{ month: string; revenue: number }> | undefined;
}

export function AdminMonthlyRevenueChart({ data }: AdminMonthlyRevenueChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Create a map of existing data
    // item.month from Django TruncMonth comes as "YYYY-MM-DD"
    const dataMap = new Map(data.map(item => [
      format(parseISO(item.month), "MMM yyyy"),
      Number(item.revenue) || 0
    ]));

    // Generate last 6 months including current month
    const end = startOfMonth(new Date());
    const start = subMonths(end, 5);
    
    const months = eachMonthOfInterval({ start, end });
    
    return months.map(date => {
      const monthStr = format(date, "MMM yyyy");
      return {
        name: monthStr,
        revenue: dataMap.get(monthStr) || 0
      };
    });
  }, [data]);

  return (
    <Card className="border shadow-sm col-span-1 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Monthly Revenue
        </CardTitle>
        <CardDescription>
          Platform earnings breakdown by month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `₹${value}`}
                  dx={-10}
                />
                <Tooltip 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] border border-dashed rounded-md bg-muted/20 text-muted-foreground">
            <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="font-medium">No monthly data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
