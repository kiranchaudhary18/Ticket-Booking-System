export interface Notification {
  id: number;
  notification_type: string;
  channel: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}
