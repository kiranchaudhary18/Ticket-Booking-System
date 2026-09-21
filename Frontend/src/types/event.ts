export interface Category {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organizer {
  id: number;
  name: string;
  email: string;
}

export type VenueType = "INDOOR" | "OUTDOOR" | "VIRTUAL";

export interface Venue {
  id: number;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  capacity: number;
  venue_type: VenueType;
  organizer: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VenueCreatePayload {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  capacity: number;
  venue_type: VenueType;
}

export type VenueUpdatePayload = Partial<VenueCreatePayload>;

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface Event {
  id: number;
  title: string;
  description: string;
  event_image: string | null;
  category: number;
  venue: number;
  organizer: number;
  status: EventStatus;
  start_date: string;
  end_date: string;
  age_limit: number | null;
  language: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventDetail extends Event {
  category_name: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
}

export interface EventCreateRequest {
  title: string;
  description: string;
  event_image?: string | null;
  category: number;
  venue: number;
  status?: EventStatus;
  start_date?: string;
  end_date?: string;
  age_limit?: number | null;
  language?: string | null;
}

export type EventUpdateRequest = Partial<EventCreateRequest>;

export interface EventStatusUpdateRequest {
  status: EventStatus;
}

export interface EventsListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Event[];
}

export interface EventFilterParams {
  search?: string;
  category?: number;
  city?: string;
  state?: string;
  language?: string;
  start_date?: string;
  end_date?: string;
  age_limit?: number;
  sort?: "newest" | "oldest" | "event_date_asc" | "event_date_desc" | "title_asc" | "title_desc";
  page?: number;
  page_size?: number;
}
