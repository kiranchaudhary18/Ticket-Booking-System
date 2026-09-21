"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CustomerHeroSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (city) params.set("city", city);
    
    // Redirect to the events page with the search queries
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 p-6 md:p-8 mb-10">
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search for events, artists, or venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-12 pr-4 bg-slate-50/50 border-slate-200 focus-visible:ring-primary rounded-xl text-base"
            />
          </div>
          
          <div className="relative sm:w-48">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="City (e.g. Mumbai)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-14 pl-12 pr-4 bg-slate-50/50 border-slate-200 focus-visible:ring-primary rounded-xl text-base"
            />
          </div>

        <Button type="submit" size="lg" className="w-full md:w-auto h-12 px-8 rounded-xl bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-semibold">
          Search Events
        </Button>
      </form>
    </div>
  );
}
