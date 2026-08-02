import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { NotificationBell } from './NotificationBell';
import { OfflineBanner } from './OfflineBanner';

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <OfflineBanner />
      <NotificationBell />
      <div className="flex-1 overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
