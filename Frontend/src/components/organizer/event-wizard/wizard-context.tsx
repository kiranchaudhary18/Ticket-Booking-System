import React, { createContext, useContext, useState, ReactNode } from "react";
import { EventDetail, Venue } from "@/types/event";
import { Show } from "@/types/booking";

export type EventType = "SEATED" | "GENERAL";

interface WizardState {
  step: number;
  setStep: (step: number) => void;
  eventId: string | number | null;
  setEventId: (id: string | number | null) => void;
  eventType: EventType;
  setEventType: (type: EventType) => void;
  venueId: number | null;
  setVenueId: (id: number | null) => void;
  shows: Show[];
  setShows: (shows: Show[] | ((prev: Show[]) => Show[])) => void;
  ticketsConfigured: boolean;
  setTicketsConfigured: (configured: boolean) => void;
  // Partial event details kept for review step
  eventDetails: Partial<EventDetail> | null;
  setEventDetails: (details: Partial<EventDetail> | null) => void;
  selectedVenue: Venue | null;
  setSelectedVenue: (venue: Venue | null) => void;
  // Hold step 1 form data before event creation
  step1Data: any;
  setStep1Data: (data: any) => void;
}

const WizardContext = createContext<WizardState | undefined>(undefined);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [eventId, setEventId] = useState<string | number | null>(null);
  const [eventType, setEventType] = useState<EventType>("GENERAL");
  const [venueId, setVenueId] = useState<number | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [ticketsConfigured, setTicketsConfigured] = useState(false);
  const [eventDetails, setEventDetails] = useState<Partial<EventDetail> | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [step1Data, setStep1Data] = useState<any>(null);

  return (
    <WizardContext.Provider
      value={{
        step,
        setStep,
        eventId,
        setEventId,
        eventType,
        setEventType,
        venueId,
        setVenueId,
        shows,
        setShows,
        ticketsConfigured,
        setTicketsConfigured,
        eventDetails,
        setEventDetails,
        selectedVenue,
        setSelectedVenue,
        step1Data,
        setStep1Data,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
