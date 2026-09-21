import { Metadata } from "next";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
  title: "Browse Events | TixGo",
  description: "Explore all upcoming events, concerts, theater shows, and more. Filter by category, venue, and date to find your perfect experience.",
};

export default function EventsPage() {
  return <EventsClient />;
}
