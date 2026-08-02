export interface Notification {
  id: string;
  type: 'ORDER' | 'PRICE' | 'SYSTEM';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResult {
  notifications: Notification[];
  unreadCount: number;
}
