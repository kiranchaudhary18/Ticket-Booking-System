"use client";

import { useMemo, useState } from "react";
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Line,
  LineChart,
  Area,
  AreaChart
} from "recharts";
import { format, subDays, isAfter } from "date-fns";
import { TrendingUp, AlertCircle, BarChart3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboardStatistics } from "@/types/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminRevenueOverviewProps {
  stats: AdminDashboardStatistics;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: Record<string, unknown>[], label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((entry: Record<string, unknown>, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color as string }} 
            />
            <span className="text-slate-600">{entry.name as string}:</span>
            <span className="font-semibold text-slate-900">₹{Number(entry.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminRevenueOverview({ stats }: AdminRevenueOverviewProps) {
  const { revenue } = stats;
  const [timeFilter, setTimeFilter] = useState<"7D" | "30D" | "ALL">("30D");

  const hasMonthlyData = revenue.monthly && revenue.monthly.length > 0;
  const hasDailyData = revenue.daily && revenue.daily.length > 0;

  // Format daily data for Recharts (filtered by selected timeframe)
  const chartData = useMemo(() => {
    if (timeFilter === "ALL") {
      if (!hasMonthlyData) return [];
      return [...revenue.monthly]
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .map(item => ({
          name: format(new Date(item.month), "MMM yyyy"),
          revenue: Number(item.revenue) || 0
        }));
    } else {
      if (!hasDailyData) return [];
      const days = timeFilter === "7D" ? 7 : 30;
      const cutoffDate = subDays(new Date(), days);
      
      return [...(revenue.daily || [])]
        .filter(item => isAfter(new Date(item.date), cutoffDate))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(item => ({
          name: format(new Date(item.date), "MMM d"),
          revenue: Number(item.revenue) || 0
        }));
    }
  }, [revenue.monthly, revenue.daily, hasMonthlyData, hasDailyData, timeFilter]);

  return (
    <Card className="border shadow-sm bg-white">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Revenue Analytics
          </CardTitle>
          <CardDescription>
            Platform financial performance over time
          </CardDescription>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setTimeFilter("7D")}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${timeFilter === "7D" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeFilter("30D")}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${timeFilter === "30D" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${timeFilter === "ALL" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            All Time
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-lg border border-slate-100 border-dashed h-[300px]">
            <AlertCircle className="h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-base font-medium text-slate-700">No Revenue Data</h3>
            <p className="text-sm text-slate-500 mt-1">
              There is no revenue data for the selected timeframe.
            </p>
          </div>
        ) : (
          <div className="h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
