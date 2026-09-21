import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Banner Skeleton */}
      <div className="w-full bg-muted relative h-[35vh] md:h-[50vh]">
        <Skeleton className="absolute inset-0 rounded-none w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full">
          <div className="container mx-auto px-4 md:px-6 pb-8 md:pb-12">
            <Button variant="ghost" size="sm" disabled className="mb-6 opacity-50">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to events
            </Button>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            
            <Skeleton className="h-12 md:h-16 w-3/4 max-w-2xl mb-4" />
            <Skeleton className="h-12 md:h-16 w-1/2 max-w-xl" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content Column Skeleton */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-card rounded-xl border border-border shadow-sm">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 pt-4 border-t border-border">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border space-y-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-40" />
                  
                  <Skeleton className="h-12 w-full mt-4" />
                  <Skeleton className="h-3 w-3/4 mx-auto" />
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
