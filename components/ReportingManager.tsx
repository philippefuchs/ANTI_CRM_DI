
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileSpreadsheet, Download, Users, UserCheck, Calendar, 
  HelpCircle, RefreshCw, Briefcase, Mail, ChevronRight,
  TrendingUp, Database, ArrowRight, ShieldCheck, Clock, FileText, Zap, Ticket, UserX
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Contact, Campaign, OutcomeDetail } from '../types';

const ReportingManager: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: cData, error: cError } = await supabase.from('contacts').select('*');
      const { data: campData, error: campError } = await supabase.from('campaigns').select('*');
      
      if (cError) throw cError;
      if (campError) throw campError;
      
      if (cData) {
        const mappedContacts = (cData as any[]).map(c => ({
          ...c,
          id: String(c.id),
          firstName: (c.first_name || c.firstName || '').toString().trim(),
          lastName: (c.last_name || c.lastName || '').toString().trim(),
          company: (c.company || '').toString().trim(),
          title: (c.title || '').toString().trim(),
          email: (c.email || '').toString().toLowerCase().trim(),
          phone: (c.phone || '').toString().trim(),
          sector: (c.sector || '').toString().trim(),
          status: (c.status || '').toString().trim(),
          category: (c.category || 'prospect').toString().toLowerCase().trim(),
          linkedinUrl: c.linkedin_url || c.linkedinUrl || '',
          createdAt: c.created_at || c.createdAt
        }));
        setContacts(mappedContacts);
      } else {
        setContacts([]);
      }
      
      if (campData) {
        setCampaigns((campData as any[]).map(camp => ({
          ...camp,
          id: String(camp.id),
          outcomes: camp.outcomes || {}
        })));
      } else {
        setCampaigns([]);
      }
      
      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Reporting load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) loadData();
  }, [loadData]);

  const downloadCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => {
        const str = String(cell || '').replace(/;/g, ',').replace(/\n/g, ' ').replace(/"/g, '""');
        return `"${str}"`;
      }).join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    link.click();
  };

  const stats = useMemo(() => {
    const prospects = contacts.filter(c => c.category === 'prospect');
    const members = contacts.filter(c => c.category === 'member');
    
    let registeredCount = 0;
    let meetingCount = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let nspCount = 0;

    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.values(camp.outcomes).forEach((o: any) => {
          const outcome = o as OutcomeDetail;
          if (outcome.status === 'Registered') registeredCount += (outcome.attendees || 1);
          if (outcome.status === 'Meeting') meetingCount++;
          if (outcome.status === 'Positive') positiveCount++;
          if (outcome.status === 'Negative') negativeCount++;
          if (outcome.status === 'None') nspCount++;
        });
      }
    });

    return { prospects, members, registeredCount, meetingCount, positiveCount, negativeCount, nspCount };
  }, [contacts, campaigns]);

  const exportProspects = () => {
    const headers = ['Société', 'Prénom', 'Nom', 'Poste', 'Email', 'Téléphone', 'Secteur', 'Statut', 'Date Création'];
    const rows = stats.prospects.map(c => [
      c.company, c.firstName, c.lastName, c.title, c.email, c.phone, c.sector, c.status, c.createdAt || ''
    ]);
    downloadCSV(`audit_prospects_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportMembers = () => {
    const headers = ['Société', 'Prénom', 'Nom', 'Poste', 'Email', 'Téléphone', 'Secteur', 'Statut', 'Date Création'];
    const rows = stats.members.map(c => [
      c.company, c.firstName, c.lastName, c.title, c.email, c.phone, c.sector, c.status, c.createdAt || ''
    ]);
    downloadCSV(`base_membres_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportRegistered = () => {
    const headers = ['Campagne', 'Société', 'Prénom', 'Nom', 'Email', 'Nombre Participants', 'Date Qualification'];
    const rows: any[][] = [];
    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.entries(camp.outcomes).forEach(([contactId, outcome]: [string, any]) => {
          if (outcome.status === 'Registered') {
            const contact = contacts.find(c => c.id === String(contactId));
            if (contact) {
              rows.push([
                camp.name, contact.company, contact.firstName, contact.lastName, 
                contact.email, outcome.attendees || 1, outcome.updatedAt || ''
              ]);
            }
          }
        });
      }
    });
    downloadCSV(`inscriptions_evenements_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportMeetings = () => {
    const headers = ['Campagne', 'Société', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Date Demande'];
    const rows: any[][] = [];
    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.entries(camp.outcomes).forEach(([contactId, outcome]: [string, any]) => {
          if (outcome.status === 'Meeting') {
            const contact = contacts.find(c => c.id === String(contactId));
            if (contact) {
              rows.push([
                camp.name, contact.company, contact.firstName, contact.lastName, 
                contact.email, contact.phone, outcome.updatedAt || ''
              ]);
            }
          }
        });
      }
    });
    downloadCSV(`rendez_vous_qualifies_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportPositive = () => {
    const headers = ['Campagne', 'Société', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Date Qualification'];
    const rows: any[][] = [];
    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.entries(camp.outcomes).forEach(([contactId, outcome]: [string, any]) => {
          if (outcome.status === 'Positive') {
            const contact = contacts.find(c => c.id === String(contactId));
            if (contact) {
              rows.push([
                camp.name, contact.company, contact.firstName, contact.lastName, 
                contact.email, contact.phone, outcome.updatedAt || ''
              ]);
            }
          }
        });
      }
    });
    downloadCSV(`interets_positifs_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportNegative = () => {
    const headers = ['Campagne', 'Société', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Date Qualification'];
    const rows: any[][] = [];
    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.entries(camp.outcomes).forEach(([contactId, outcome]: [string, any]) => {
          if (outcome.status === 'Negative') {
            const contact = contacts.find(c => c.id === String(contactId));
            if (contact) {
              rows.push([
                camp.name, contact.company, contact.firstName, contact.lastName, 
                contact.email, contact.phone, outcome.updatedAt || ''
              ]);
            }
          }
        });
      }
    });
    downloadCSV(`refus_negatifs_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportNSP = () => {
    const headers = ['Campagne', 'Société', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Date Qualification'];
    const rows: any[][] = [];
    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.entries(camp.outcomes).forEach(([contactId, outcome]: [string, any]) => {
          if (outcome.status === 'None') {
            const contact = contacts.find(c => c.id === String(contactId));
            if (contact) {
              rows.push([
                camp.name, contact.company, contact.firstName, contact.lastName, 
                contact.email, contact.phone, outcome.updatedAt || ''
              ]);
            }
          }
        });
      }
    });
    downloadCSV(`contacts_nsp_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
       <RefreshCw className="animate-spin text-indigo-600" size={48} />
       <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 italic animate-pulse">Audit des tables Cloud...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-10 space-y-8 lg:space-y-12 bg-[#F8FAFC] min-h-screen animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 lg:pb-10 gap-6">
        <div>
           <h2 className="text-2xl lg:text-4xl font-black uppercase italic tracking-tighter text-slate-900">Reporting <span className="text-indigo-600">& Exports</span></h2>
           <div className="flex items-center gap-2.5 mt-2.5 bg-white px-3 py-1 lg:px-4 lg:py-1.5 rounded-full w-fit border border-slate-200 shadow-sm">
              <Clock size={12} className="text-slate-400" />
              <p className="text-[8px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Sync : <span className="text-slate-900">{lastSync}</span></p>
           </div>
        </div>
        <button onClick={loadData} className="w-full md:w-auto px-6 py-3 bg-white border border-slate-200 rounded-xl lg:rounded-2xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-3 font-bold text-[9px] lg:text-[11px] uppercase tracking-widest active:scale-95">
           <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
        
        {/* PROSPECTS */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-300">
           <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[24px] w-fit mb-6 lg:mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <Database size={24} />
           </div>
           <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter mb-2 text-slate-900">Audit Leads</h3>
           <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase mb-6 lg:mb-8">Extraction brute base leads.</p>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl lg:text-4xl font-black italic text-slate-900">{stats.prospects.length}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">Leads</span>
              </div>
              <button onClick={exportProspects} className="px-5 py-3 bg-slate-900 text-white rounded-xl lg:rounded-[24px] text-[8px] lg:text-[10px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600 shadow-lg active:scale-95">
                 <Download size={12}/> CSV
              </button>
           </div>
        </div>

        {/* MEMBRES */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-400">
           <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[24px] w-fit mb-6 lg:mb-8 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <Users size={24} />
           </div>
           <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter mb-2 text-slate-900">Base Membres</h3>
           <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase mb-6 lg:mb-8">Liste certifiée membres actifs.</p>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl lg:text-4xl font-black italic text-emerald-600">{stats.members.length}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">Validés</span>
              </div>
              <button onClick={exportMembers} className="px-5 py-3 bg-emerald-600 text-white rounded-xl lg:rounded-[24px] text-[8px] lg:text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-700 shadow-lg active:scale-95">
                 <Download size={12}/> CSV
              </button>
           </div>
        </div>

        {/* RDV */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-450">
           <div className="p-4 bg-violet-50 text-violet-600 rounded-[24px] w-fit mb-6 lg:mb-8 group-hover:bg-violet-600 group-hover:text-white transition-all shadow-sm">
              <Calendar size={24} />
           </div>
           <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter mb-2 text-slate-900">Rendez-vous</h3>
           <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase mb-6 lg:mb-8">Export des RDV qualifiés.</p>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl lg:text-4xl font-black italic text-violet-600">{stats.meetingCount}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">Qualifiés</span>
              </div>
              <button onClick={exportMeetings} className="px-5 py-3 bg-violet-600 text-white rounded-xl lg:rounded-[24px] text-[8px] lg:text-[10px] font-black uppercase flex items-center gap-2 hover:bg-violet-700 shadow-lg active:scale-95">
                 <Download size={12}/> CSV
              </button>
           </div>
        </div>

        {/* REFUS (NON) - AJOUTÉ */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-480">
           <div className="p-4 bg-rose-50 text-rose-600 rounded-[24px] w-fit mb-6 lg:mb-8 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
              <UserX size={24} />
           </div>
           <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter mb-2 text-slate-900">Refus (NON)</h3>
           <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase mb-6 lg:mb-8">Audit des réponses négatives.</p>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl lg:text-4xl font-black italic text-rose-600">{stats.negativeCount}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">Désistés</span>
              </div>
              <button onClick={exportNegative} className="px-5 py-3 bg-rose-600 text-white rounded-xl lg:rounded-[24px] text-[8px] lg:text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-700 shadow-lg active:scale-95">
                 <Download size={12}/> CSV
              </button>
           </div>
        </div>

        {/* SALON */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-500">
           <div className="p-4 bg-amber-50 text-amber-500 rounded-[24px] w-fit mb-6 lg:mb-8 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
              <Ticket size={24} />
           </div>
           <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter mb-2 text-slate-900">Salons Pro</h3>
           <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase mb-6 lg:mb-8">Inscriptions événements salon.</p>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl lg:text-4xl font-black italic text-amber-500">{stats.registeredCount}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">Inscrits</span>
              </div>
              <button onClick={exportRegistered} className="px-5 py-3 bg-amber-500 text-white rounded-xl lg:rounded-[24px] text-[8px] lg:text-[10px] font-black uppercase flex items-center gap-2 hover:bg-amber-600 shadow-lg active:scale-95">
                 <Download size={12}/> CSV
              </button>
           </div>
        </div>

        {/* NSP */}
        <div className="bg-white p-6 lg:p-10 rounded-[40px] lg:rounded-[56px] border border-slate-200 shadow-sm hover:shadow-xl transition-all group animate-in slide-in-from-bottom-2 duration-600">
           <div className="p-4 bg-slate-100 text-slate-400 rounded-[24px] w-fit mb-6 lg:mb-8 group-hover:bg-slate-500 group-hover:text-white transition-all shadow-sm">
              <HelpCircle size={24} />
           </div>
           <h3 className="text-xl lg:text-2xl font-black italic uppercase tracking-tighter mb-2 text-slate-900">Leads NSP</h3>
           <p className="text-[9px] lg:text-[11px] font-bold text-slate-400 uppercase mb-6 lg:mb-8">Contacts à relancer (Incertains).</p>
           <div className="mt-auto flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl lg:text-4xl font-black italic text-slate-400">{stats.nspCount}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 mt-1 tracking-widest">Relances</span>
              </div>
              <button onClick={exportNSP} className="px-5 py-3 bg-slate-200 text-slate-700 rounded-xl lg:rounded-[24px] text-[8px] lg:text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-300 shadow-lg active:scale-95">
                 <Download size={12}/> CSV
              </button>
           </div>
        </div>

      </div>

      <div className="bg-slate-900 p-8 lg:p-12 rounded-[40px] lg:rounded-[64px] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl animate-in zoom-in duration-500">
         <div className="space-y-3 text-center md:text-left">
            <h4 className="text-xl lg:text-3xl font-black uppercase italic tracking-tighter leading-none">Intelligence Hub Export</h4>
            <p className="text-[8px] lg:text-[11px] font-bold uppercase tracking-[0.1em] opacity-60 italic">Données consolidées pour CRM / Excel externe.</p>
         </div>
         <div className="flex items-center gap-6 lg:gap-10">
            <div className="flex flex-col items-end">
               <span className="text-4xl lg:text-6xl font-black italic tracking-tighter leading-none">{contacts.length}</span>
               <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mt-1 lg:mt-2">Total Base</span>
            </div>
            <ArrowRight size={30} className="opacity-20 hidden md:block" />
            <div className="w-16 h-16 lg:w-20 h-20 bg-white/5 rounded-[24px] lg:rounded-[32px] flex items-center justify-center border border-white/10 shadow-inner">
               <FileSpreadsheet size={32} className="text-indigo-400" />
            </div>
         </div>
      </div>
    </div>
  );
};

export default ReportingManager;
