import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4 text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-accent" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
