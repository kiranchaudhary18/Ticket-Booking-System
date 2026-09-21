"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Ticket as TicketIcon, 
  AlertCircle,
  RefreshCw
} from "lucide-react";

import { ticketService } from "@/services/ticket.service";
import { TicketListItem } from "@/types/ticket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { TicketCard } from "@/components/tickets/TicketCard";
import { EmptyState } from "@/components/ui/empty-state";

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTickets = async () => {
    // Prevent synchronous setState
    await Promise.resolve();
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await ticketService.getMyTickets();
      
      // Sort by newest issued first
      const sorted = data.sort((a, b) => 
        new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
      );
      
      setTickets(sorted);
    } catch (err: unknown) {
      console.error("Failed to fetch tickets", err);
      const axiosErr = err as { message?: string };
      setError(axiosErr?.message || "Failed to load your tickets. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchTickets());
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-muted-foreground mt-2">View and manage your event tickets.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchTickets}
          disabled={isRefreshing || isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="mt-4 text-muted-foreground">Loading your tickets...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={fetchTickets}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : tickets.length > 0 ? (
        <div className="flex flex-col gap-6">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.ticket_number} ticket={ticket} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<TicketIcon className="h-12 w-12 text-muted-foreground" />}
          title="No tickets yet"
          message="You haven't booked any tickets. Discover upcoming events and secure your seats today."
          actionLabel="Explore Events"
          onAction={() => {
            router.push("/events");
          }}
        />
      )}
    </div>
  );
}
