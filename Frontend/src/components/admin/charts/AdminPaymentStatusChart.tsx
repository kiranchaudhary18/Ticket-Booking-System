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
import { CreditCard } from "lucide-react";
import { AdminRevenueReport } from "@/types/admin";

interface AdminPaymentStatusChartProps {
  data: AdminRevenueReport | null | undefined;
}

const COLORS = {
  successful: "hsl(var(--primary))",
  pending: "hsl(var(--muted-foreground))",
  failed: "hsl(var(--destructive))"
};

export function AdminPaymentStatusChart({ data }: AdminPaymentStatusChartProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return [
      { name: "Successful", value: data.successful_payments, color: COLORS.successful },
      { name: "Pending", value: data.pending_payments, color: COLORS.pending },
      { name: "Failed", value: data.failed_payments, color: COLORS.failed },
    ].filter(item => item.value > 0); // Only show statuses that have payments
  }, [data]);

  return (
    <Card className="border shadow-sm col-span-1 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Status Distribution
        </CardTitle>
        <CardDescription>
          Overview of transaction success rates.
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
                  formatter={(value: any) => [value, "Transactions"]}
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
            <CreditCard className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="font-medium">No payment data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
