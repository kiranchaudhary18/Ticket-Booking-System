import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AdminLoadingStateProps {
  type?: "table" | "chart" | "kpi" | "list" | "default";
  rows?: number;
}

export function AdminLoadingState({ type = "default", rows = 5 }: AdminLoadingStateProps) {
  if (type === "kpi") {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-1" />
              <Skeleton className="h-3 w-[140px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "chart") {
    return (
      <Card className="border shadow-sm h-full min-h-[350px] flex flex-col">
        <CardHeader>
          <Skeleton className="h-5 w-[150px] mb-2" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent className="flex-1 flex items-end justify-between gap-2 pt-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="w-full bg-muted/60" style={{ height: `${20 + (i * 15) % 80}%` }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (type === "table") {
    return (
      <div className="rounded-md border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-6 w-[200px]" />
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between pb-2 border-b">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[50px]" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex justify-between py-2 items-center">
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default / list
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-medium text-muted-foreground">Loading data...</p>
    </div>
  );
}
