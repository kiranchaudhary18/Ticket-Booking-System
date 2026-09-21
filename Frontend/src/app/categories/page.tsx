import { Metadata } from "next";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "Event Categories | TicketMaster",
  description:
    "Browse event categories such as concerts, theatre, comedy and sports, and discover every event on sale in each space.",
};

export default function CategoriesPage() {
  return <CategoriesClient />;
}