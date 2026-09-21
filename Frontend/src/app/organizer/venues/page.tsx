"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Venue } from "@/types/event";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";

export default function OrganizerVenuesPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenuesData = useCallback(async () => {
    // Prevent synchronous setState
    await Promise.resolve();
    try {
      setIsLoading(true);
      setError(null);
      
      const allVenues = await organizerService.getVenues();
      
      // The backend now filters venues via OrganizerVenueListView
      const myVenues = [...allVenues];
      
      setVenues(myVenues);
    } catch (err: unknown) {
      console.error("Failed to load organizer venues:", err);
      setError("Failed to load your venues. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => fetchVenuesData());
    }
  }, [user, fetchVenuesData]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <ErrorState 
        type="api"
        message={error}
        onRetry={fetchVenuesData}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Venues</h1>
          <p className="text-muted-foreground mt-1">
            Manage your physical and virtual event locations.
          </p>
        </div>
        <Button asChild>
          <Link href="/organizer/venues/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Venue
          </Link>
        </Button>
      </div>

      {venues.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
          title="No venues found"
          message="You haven't created any venues yet. Create a venue to start hosting events."
          actionLabel="Create Your First Venue"
          onAction={() => {
            router.push("/organizer/venues/create");
          }}
        />
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div className="rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="px-4 py-3">Venue Name</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Capacity</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {venues.map((venue) => (
                    <tr key={venue.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {venue.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-1 max-w-[200px]" title={`${venue.address}, ${venue.city}, ${venue.state} - ${venue.pincode}`}>
                          {venue.city}, {venue.state}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {venue.venue_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {venue.capacity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${venue.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {venue.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/organizer/venues/${venue.id}/edit`} className="text-primary hover:text-primary/80">
                            <Edit className="h-4 w-4 mr-2" /> Manage
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
