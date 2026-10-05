export type TicketStatus = 'OPEN' | 'PENDING' | 'CLOSED';
export type Urgency = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type Direction = 'INBOUND' | 'OUTBOUND';

export interface Customer {
  id: string;
  name: string | null;
  email: string;
  language?: string | null;
}

export interface Message {
  id: string;
  ticketId?: string;
  direction: Direction;
  originalText: string;
  originalLanguage: string | null;
  translatedText: string | null;
  translatedLanguage: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: TicketStatus;
  topic: string | null;
  urgency: Urgency;
  summary: string | null;
  aiStatus: string;
  lastMessageAt: string;
  createdAt?: string;
  customer: Customer;
  messages: Message[];
}
