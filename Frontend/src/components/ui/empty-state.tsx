import React, { ReactNode } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  title = "No data found", 
  message = "There is currently no data available to display.", 
  icon = <FolderOpen className="h-12 w-12 text-muted-foreground" />,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center px-4 w-full ${className || ""}`}>
      <div className="bg-muted p-5 rounded-full mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground mb-8 max-w-md">
        {message}
      </p>
      {onAction && actionLabel && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
