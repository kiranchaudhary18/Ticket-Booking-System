// Use the backend URL directly to avoid Next.js proxy trailing slash normalization issues
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// You can define reusable endpoint constants here as the application grows
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/accounts/login/",
    REGISTER: "/api/accounts/register/",
    REFRESH: "/api/accounts/refresh/",
    LOGOUT: "/api/accounts/logout/",
    ME: "/api/accounts/me/",
    CUSTOMER_PROFILE: "/api/accounts/customer-profile/",
    ORGANIZER_PROFILE: "/api/accounts/organizer-profile/",
  },
  EVENTS: {
    LIST: "/api/events/events/",
    DETAIL: (id: string | number) => `/api/events/events/${id}/`,
    CATEGORIES: "/api/events/categories/",
    VENUES: "/api/events/venues/",
    SEATS: "/api/events/seats/",
    SHOWS: "/api/events/shows/",
    NOTIFICATIONS: "/api/events/notifications/",
  }
};
