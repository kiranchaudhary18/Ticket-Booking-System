import { Event } from "./event";

export interface WishlistItem {
  id: number;
  event: Event;
  created_at: string;
}

export interface WishlistCreateRequest {
  event_id: number;
}
