"use client";

import React from "react";
import { WizardProvider, useWizard } from "@/components/organizer/event-wizard/wizard-context";
import { Card } from "@/components/ui/card";
import { ChevronRight, Check } from "lucide-react";
import Step1EventInfo from "@/components/organizer/event-wizard/Step1EventInfo";
import Step2Venue from "@/components/organizer/event-wizard/Step2Venue";
import Step3Shows from "@/components/organizer/event-wizard/Step3Shows";
import Step4Tickets from "@/components/organizer/event-wizard/Step4Tickets";
import Step5Seats from "@/components/organizer/event-wizard/Step5Seats";
import Step6Review from "@/components/organizer/event-wizard/Step6Review";

const STEPS = [
  { id: 1, title: "Event" },
  { id: 2, title: "Venue" },
  { id: 3, title: "Shows" },
  { id: 4, title: "Tickets & Seats" },
  { id: 5, title: "Review" },
];

function WizardProgress() {
  const { step, eventType } = useWizard();

  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {STEPS.map((s, stepIdx) => {
            // Adjust title for step 4 based on eventType
            let title = s.title;
            if (s.id === 4) {
              title = eventType === "SEATED" ? "Seats" : "Tickets";
            }

            // Map wizard steps (1-6) to UI steps (1-5)
            // Step 1: Event
            // Step 2: Venue
            // Step 3: Shows
            // Step 4 (Non-seated) or Step 5 (Seated) -> maps to UI Step 4
            // Step 6: Review -> maps to UI Step 5
            
            let uiStatus = "upcoming";
            let mappedCurrentUiStep = 1;
            
            if (step === 1) mappedCurrentUiStep = 1;
            else if (step === 2) mappedCurrentUiStep = 2;
            else if (step === 3) mappedCurrentUiStep = 3;
            else if (step === 4 || step === 5) mappedCurrentUiStep = 4;
            else if (step === 6) mappedCurrentUiStep = 5;

            if (s.id < mappedCurrentUiStep) uiStatus = "complete";
            else if (s.id === mappedCurrentUiStep) uiStatus = "current";

            return (
              <li key={s.title} className={`relative ${stepIdx !== STEPS.length - 1 ? "pr-8 sm:pr-20" : ""}`}>
                <div className="flex items-center">
                  <div
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                      uiStatus === "complete"
                        ? "bg-indigo-600 hover:bg-indigo-900"
                        : uiStatus === "current"
                        ? "border-2 border-indigo-600 bg-white"
                        : "border-2 border-gray-300 bg-white"
                    }`}
                  >
                    {uiStatus === "complete" ? (
                      <Check className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : (
                      <span
                        className={
                          uiStatus === "current" ? "text-indigo-600 font-medium" : "text-gray-500 font-medium"
                        }
                      >
                        {s.id}
                      </span>
                    )}
                  </div>
                  {stepIdx !== STEPS.length - 1 ? (
                    <div className="absolute top-4 w-full -translate-y-1/2">
                      <div
                        className={`h-0.5 w-full ${
                          uiStatus === "complete" ? "bg-indigo-600" : "bg-gray-200"
                        }`}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="absolute top-10 w-full">
                  <span
                    className={`text-xs font-medium ${
                      uiStatus === "current"
                        ? "text-indigo-600"
                        : uiStatus === "complete"
                        ? "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {title}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

function WizardContent() {
  const { step } = useWizard();

  return (
    <div className="w-full">
      <WizardProgress />
      <div className="mt-12">
        {step === 1 && <Step1EventInfo />}
        {step === 2 && <Step2Venue />}
        {step === 3 && <Step3Shows />}
        {step === 4 && <Step4Tickets />}
        {step === 5 && <Step5Seats />}
        {step === 6 && <Step6Review />}
      </div>
    </div>
  );
}

export default function EventWizardPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Event</h1>
        <p className="text-muted-foreground mt-2">
          Complete the steps below to publish a new event and make it bookable.
        </p>
      </div>
      <WizardProvider>
        <WizardContent />
      </WizardProvider>
    </div>
  );
}
