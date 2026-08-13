import type { Role } from '@farmconnect/shared';

export interface SupportMessage {
  id: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  orderId: string | null;
  createdAt: string;
}

export interface SupportInboxEntry {
  userId: string;
  userName: string | null;
  userPhone: string;
  userRole: (typeof Role)[keyof typeof Role];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
