import { Metadata } from "next";
import EventDetailClient from "./EventDetailClient";
import { eventService } from "@/services/event.service";

// Next.js requires params to be awaited in newer versions, but if this is an older version it's fine.
// Using Promise<any> to be safe with Next.js 15+ changes, but using the standard approach.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const event = await eventService.getEventDetail(resolvedParams.id);
    
    // Create a safe description avoiding sensitive info (only using public description/title)
    const description = event.description 
      ? (event.description.length > 160 ? event.description.substring(0, 157) + "..." : event.description)
      : `Buy tickets for ${event.title} securely on TixGo.`;
      
    return {
      title: `${event.title} | TixGo`,
      description,
    };
  } catch {
    return {
      title: "Event Details | TixGo",
      description: "View event details and book tickets securely on TixGo.",
    };
  }
}

export default function EventDetailPage() {
  return <EventDetailClient />;
}
