export interface OrganizerProfile {
  id: number;
  name: string;      // from user
  email: string;     // from user
  role: string;      // from user
  phone: string;
  organization_name: string;
  organization_description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  profile_picture: string | null;
  bank_account_number?: string;
  bank_ifsc?: string;
  razorpay_linked_account_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizerProfileUpdateData {
  phone: string;
  organization_name: string;
  organization_description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
}
