import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Ticket } from '../types/ticket';

interface AppContextType {
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  agentLanguage: string;
  setAgentLanguage: (lang: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  // Add more global state as needed
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agentLanguage, setAgentLanguage] = useState<string>(() => {
    return localStorage.getItem('agentLanguage') || 'en';
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Persist language preference to localStorage
  useEffect(() => {
    localStorage.setItem('agentLanguage', agentLanguage);
  }, [agentLanguage]);

  const value = {
    tickets,
    setTickets,
    agentLanguage,
    setAgentLanguage,
    isConnected,
    setIsConnected,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}