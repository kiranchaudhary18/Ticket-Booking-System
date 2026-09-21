import React from "react";
import { AlertCircle, RefreshCw, ServerCrash, WifiOff, ShieldAlert, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorType = "api" | "network" | "404" | "401" | "403" | "payment" | "booking" | "generic";

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onRetry?: () => void;
  className?: string;
  type?: ErrorType;
}

export function ErrorState({ 
  title, 
  message, 
  icon,
  actionLabel,
  onAction,
  onRetry,
  className,
  type = "generic"
}: ErrorStateProps) {
  
  // Default configurations based on error type
  const config = {
    api: {
      defaultTitle: "Server Error",
      defaultMessage: "We're experiencing issues communicating with our servers. Please try again in a moment.",
      defaultIcon: <ServerCrash className="h-12 w-12 text-destructive" />
    },
    network: {
      defaultTitle: "Connection Error",
      defaultMessage: "It looks like you're offline or experiencing network issues. Please check your connection.",
      defaultIcon: <WifiOff className="h-12 w-12 text-destructive" />
    },
    "404": {
      defaultTitle: "Page Not Found",
      defaultMessage: "The page you're looking for doesn't exist or has been moved.",
      defaultIcon: <FileQuestion className="h-12 w-12 text-muted-foreground" />
    },
    "401": {
      defaultTitle: "Authentication Required",
      defaultMessage: "You need to be logged in to access this page.",
      defaultIcon: <ShieldAlert className="h-12 w-12 text-amber-500" />
    },
    "403": {
      defaultTitle: "Access Denied",
      defaultMessage: "You don't have permission to view this content or perform this action.",
      defaultIcon: <ShieldAlert className="h-12 w-12 text-destructive" />
    },
    payment: {
      defaultTitle: "Payment Failed",
      defaultMessage: "We couldn't process your payment. Please check your payment details and try again.",
      defaultIcon: <AlertCircle className="h-12 w-12 text-destructive" />
    },
    booking: {
      defaultTitle: "Booking Failed",
      defaultMessage: "We couldn't complete your booking. The seats might have been taken or there was a system error.",
      defaultIcon: <AlertCircle className="h-12 w-12 text-destructive" />
    },
    generic: {
      defaultTitle: "Oops! Something went wrong",
      defaultMessage: "An unexpected error occurred while processing your request.",
      defaultIcon: <AlertCircle className="h-12 w-12 text-destructive" />
    }
  };

  const currentConfig = config[type];
  
  // Clean up raw server error messages if they slip through
  let safeMessage = message || currentConfig.defaultMessage;
  if (typeof safeMessage === 'string' && (safeMessage.includes('{"') || safeMessage.includes('Traceback') || safeMessage.includes('Exception'))) {
    safeMessage = currentConfig.defaultMessage;
  }

  return (
    <div role="alert" aria-live="assertive" className={cn("flex flex-col items-center justify-center py-20 text-center px-4 w-full", className)}>
      <div className="bg-destructive/10 p-5 rounded-full mb-5">
        {icon || currentConfig.defaultIcon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title || currentConfig.defaultTitle}</h3>
      <p className="text-muted-foreground mb-8 max-w-md">
        {safeMessage}
      </p>
      
      <div className="flex gap-3 flex-wrap justify-center">
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="min-w-[120px]">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
        
        {onAction && actionLabel && (
          <Button onClick={onAction} className="min-w-[120px]">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
