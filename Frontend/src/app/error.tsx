"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global uncaught error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <ErrorState 
        type="generic"
        onRetry={reset}
      />
      <Button asChild variant="ghost" className="mt-4">
        <Link href="/">
          <Home className="mr-2 h-4 w-4" /> Return to Home
        </Link>
      </Button>
    </div>
  );
}
