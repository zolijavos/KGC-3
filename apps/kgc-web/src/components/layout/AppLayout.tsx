import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden kgc-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto kgc-bg">{children}</main>
    </div>
  );
}
