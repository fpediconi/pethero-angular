export interface NotificationItem {
  id: string;
  userId: string | number;
  message: string;
  createdAt: string;
  read?: boolean;
}

