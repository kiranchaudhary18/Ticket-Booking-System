import { apiClient } from "./api-client";
import { ENDPOINTS } from "@/lib/api";
import { Seat } from "@/types/booking";

/**
 * Pricing helpers.
 *
 * The Backend does not expose a price on an Event: ticket prices live on the
 * Seats of the Venue that hosts the event. Therefore the "starting price" of an
 * event is the cheapest active seat of its venue.
 *
 * The (unpaginated) seat list is fetched at most once per page session and kept
 * in memory, so a grid of event cards needs a single extra request instead of
 * one request per card. Pricing is treated as optional everywhere: if it cannot
 * be loaded the UI simply renders without a price instead of failing.
 */

type SeatPricing = Pick<Seat, "venue" | "price" | "is_active">;

export type VenuePriceMap = Record<number, number>;

let cachedVenuePrices: VenuePriceMap | null = null;
let pendingRequest: Promise<VenuePriceMap> | null = null;

function extractSeatList(payload: unknown): SeatPricing[] {
  if (Array.isArray(payload)) {
    return payload as SeatPricing[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: SeatPricing[] }).results;
  }
  return [];
}

function buildVenuePriceMap(seats: SeatPricing[]): VenuePriceMap {
  const map: VenuePriceMap = {};

  for (const seat of seats) {
    if (seat.is_active === false) continue;

    const venueId = Number(seat.venue);
    const price = Number(seat.price);

    if (!Number.isFinite(venueId) || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    if (map[venueId] === undefined || price < map[venueId]) {
      map[venueId] = price;
    }
  }

  return map;
}

/**
 * Loads the cheapest active seat price per venue (cached for the session).
 */
async function loadVenuePrices(): Promise<VenuePriceMap> {
  if (cachedVenuePrices) return cachedVenuePrices;
  if (pendingRequest) return pendingRequest;

  pendingRequest = apiClient
    .get(ENDPOINTS.EVENTS.SEATS)
    .then((response) => {
      const map = buildVenuePriceMap(extractSeatList(response.data));
      cachedVenuePrices = map;
      return map;
    })
    .catch((error) => {
      console.error("Failed to load seat pricing:", error);
      // Fail soft: pricing is supplementary information only.
      return {} as VenuePriceMap;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

const priceFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const pricingService = {
  /**
   * Maps venueId -> cheapest active seat price for that venue.
   */
  getVenueStartingPrices: loadVenuePrices,

  /**
   * Cheapest active seat price for a single venue (null when unknown).
   */
  async getStartingPriceForVenue(
    venueId?: number | null
  ): Promise<number | null> {
    if (!venueId) return null;
    const prices = await loadVenuePrices();
    return prices[venueId] ?? null;
  },

  /**
   * Resolves starting prices for a batch of venues (null when unknown).
   */
  async getStartingPricesForVenues(
    venueIds: Array<number | null | undefined>
  ): Promise<Record<number, number | null>> {
    const prices = await loadVenuePrices();
    const result: Record<number, number | null> = {};

    for (const venueId of venueIds) {
      if (!venueId) continue;
      result[venueId] = prices[venueId] ?? null;
    }

    return result;
  },
};

/**
 * Formats a numeric amount as an INR price, or returns null when unavailable.
 */
export function formatPrice(amount: number | null | undefined): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return null;
  }
  return priceFormatter.format(amount);
}
