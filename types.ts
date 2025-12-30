
export enum ProspectStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  INTERESTED = 'Interested',
  CLOSED = 'Closed',
  LOST = 'Lost',
  ACTIVE = 'Active'
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  title?: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  address?: string;
  sector?: string;
  website?: string;
  status: ProspectStatus | string;
  notes: string;
  tags: string[];
  createdAt: string;
  lastInteraction?: string;
  category: 'prospect' | 'member';
  score?: number;
  scoreReason?: string;
}

export type Prospect = Contact;

export type CampaignOutcome = 'Positive' | 'Negative' | 'Meeting' | 'Bounced' | 'Registered' | 'None';

export interface OutcomeDetail {
  status: CampaignOutcome;
  attendees?: number;
  updatedAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Draft' | 'Running' | 'Completed';
  channel: 'Email' | 'LinkedIn';
  template?: string;
  subject?: string;
  sent: number;
  opened: number;
  replied: number;
  targetContactIds: string[];
  createdAt: string;
  goal?: 'Meeting' | 'Positive' | 'Event';
  outcomes?: Record<string, OutcomeDetail>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  createdAt: string;
}
