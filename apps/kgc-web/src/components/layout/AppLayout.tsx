import { useState, type ReactNode } from 'react';
import { FloatingChat } from '../chat';
import { CommandPalette } from '../command';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden kgc-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onCommandPaletteOpen={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto kgc-bg">{children}</main>
      </div>
      <FloatingChat />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
