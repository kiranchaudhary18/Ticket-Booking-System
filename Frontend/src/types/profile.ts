import { UserRole } from "./auth";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserProfileRequest {
  name: string;
}

export interface BaseProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  profile_picture: string | null; // URL string
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile extends BaseProfile {
  date_of_birth: string | null; // YYYY-MM-DD
  gender: string | null;
}

export interface OrganizerProfile extends BaseProfile {
  organization_name: string | null;
  organization_description: string | null;
  website: string | null;
}

// For updating, we omit read-only fields
export type UpdateCustomerProfileRequest = Partial<
  Omit<CustomerProfile, "id" | "name" | "email" | "role" | "created_at" | "updated_at">
>;

export type UpdateOrganizerProfileRequest = Partial<
  Omit<OrganizerProfile, "id" | "name" | "email" | "role" | "created_at" | "updated_at">
>;
