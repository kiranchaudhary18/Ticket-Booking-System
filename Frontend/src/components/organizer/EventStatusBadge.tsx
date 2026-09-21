import { Badge } from "@/components/ui/badge";
import { Event } from "@/types/event";

interface EventStatusBadgeProps {
  event: Event;
  className?: string;
}

export function EventStatusBadge({ event, className }: EventStatusBadgeProps) {
  // Derive visual status based on actual backend fields (status, is_active, end_date)
  let statusText = "UNKNOWN";
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let additionalClasses = "";

  if (event.status === "DRAFT") {
    statusText = "Draft";
    variant = "secondary";
  } else if (event.status === "CANCELLED") {
    statusText = "Cancelled";
    variant = "destructive";
  } else if (event.status === "PUBLISHED") {
    if (!event.is_active) {
      statusText = "Inactive";
      variant = "outline";
      additionalClasses = "text-muted-foreground border-muted-foreground";
    } else {
      const isCompleted = new Date(event.end_date) < new Date();
      if (isCompleted) {
        statusText = "Completed";
        variant = "secondary";
        additionalClasses = "bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-300";
      } else {
        statusText = "Active";
        variant = "default";
        additionalClasses = "bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-300";
      }
    }
  }

  return (
    <Badge variant={variant} className={`${additionalClasses} ${className || ""}`}>
      {statusText}
    </Badge>
  );
}
