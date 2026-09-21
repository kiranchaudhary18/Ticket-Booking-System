import { Badge } from "@/components/ui/badge";

export type StatusType = "success" | "warning" | "error" | "default" | "info";

interface StatusBadgeProps {
  status: string;
  type?: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, string> = {
  success: "bg-success/15 text-success hover:bg-success/25 border-success/20",
  error: "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20",
  warning: "bg-highlight/15 text-highlight hover:bg-highlight/25 border-highlight/20",
  info: "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 border-blue-500/20",
  default: "bg-muted text-muted-foreground hover:bg-muted/80",
};

export function StatusBadge({ status, type = "default", className = "" }: StatusBadgeProps) {
  // Try to automatically determine the type if it's set to default but we recognize the status
  let finalType = type;
  if (type === "default") {
    const lowerStatus = status.toLowerCase();
    if (["active", "success", "confirmed", "published"].includes(lowerStatus)) finalType = "success";
    else if (["cancelled", "failed", "error", "inactive"].includes(lowerStatus)) finalType = "error";
    else if (["pending", "draft", "processing"].includes(lowerStatus)) finalType = "warning";
  }

  return (
    <Badge 
      variant="outline" 
      className={`${statusConfig[finalType]} capitalize font-medium tracking-wide ${className}`}
    >
      {status.toLowerCase()}
    </Badge>
  );
}
