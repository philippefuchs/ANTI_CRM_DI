
import Dexie, { type Table } from 'dexie';
import { Contact, Campaign } from '../types';

export interface ConfigRecord {
  id?: number; // Clé primaire fixe (1) pour la config maître
  uuid: string;
  name: string;
  timestamp: string;
  isActive: number;
  data: {
    emailjsPublicKey: string;
    emailjsServiceId: string;
    emailjsTemplateId: string;
    senderName: string;
    senderEmail: string;
  };
}

export class LeadGenDatabase extends Dexie {
  contacts!: Table<Contact>;
  campaigns!: Table<Campaign>;
  configRecords!: Table<ConfigRecord>;

  constructor() {
    super('LeadGenAI_ProductionDB');
    // Fixed: Property 'version' does not exist on type 'LeadGenDatabase' by casting this to any to access the base Dexie version method
    (this as any).version(5).stores({
      contacts: '++_localId, id, firstName, lastName, company, email, category, status',
      campaigns: '++_localId, id, name, status, channel, createdAt',
      configRecords: 'id, uuid, isActive' // ID fixe pour singleton
    });
  }
}

export const db = new LeadGenDatabase();
