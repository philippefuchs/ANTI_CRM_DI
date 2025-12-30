import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Contact } from '../types';
import { Users, RefreshCw, Upload, Plus, Search } from 'lucide-react';
import { supabase } from '../services/supabase';
import ContactList from './ContactList';
import ContactFormModal from './ContactFormModal';
import ImportCSVModal from './ImportCSVModal';
import { useToast } from './ToastProvider';

interface ContactManagerProps {
  category: 'prospect' | 'member';
}

const ContactManager: React.FC<ContactManagerProps> = ({ category }) => {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const themeColor = category === 'member' ? 'emerald' : 'indigo';
  const gradientClass = category === 'member' ? 'from-emerald-500 to-teal-600' : 'from-indigo-500 to-violet-600';

  const stringifyError = (err: any): string => {
    if (!err) return "Erreur inconnue";
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    return String(err);
  };

  const fetchContacts = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const targetCategory = category.toLowerCase().trim();
        const normalized = (data as any[])
          .map(c => ({
            ...c,
            id: String(c.id),
            firstName: (c.first_name || c.firstName || c.prenom || '').toString().trim(),
            lastName: (c.last_name || c.lastName || c.nom || '').toString().trim(),
            company: (c.company || c.societe || '').toString().trim(),
            title: (c.title || c.poste || '').toString().trim(),
            email: (c.email || '').toString().toLowerCase().trim(),
            phone: (c.phone || c.telephone || c.tel || '').toString().trim(),
            linkedinUrl: c.linkedin_url || c.linkedinUrl || '',
            website: c.website || c.site_web || '',
            sector: (c.sector || c.secteur || '').toString().trim(),
            address: (c.address || c.adresse || '').toString().trim(),
            notes: (c.notes || '').toString().trim(),
            tags: Array.isArray(c.tags) ? c.tags : (c.tags ? String(c.tags).split(',').map((t: any) => t.trim()).filter((t: any) => t) : []),
            status: (c.status || c.statut || '').toString().trim(),
            category: (c.category || 'prospect').toString().toLowerCase().trim(),
            createdAt: c.created_at || c.createdAt
          }))
          .filter(c => c.category === targetCategory);

        setContacts(normalized);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const executeDelete = async (id: string) => {
    if (!supabase) return;
    try {
      const sId = String(id);
      const idToUse = (sId.includes('-') || isNaN(Number(sId))) ? sId : Number(sId);
      const { error } = await supabase.from('contacts').delete().eq('id', idToUse);
      if (error) throw error;
      setContacts(prev => prev.filter(c => c.id !== id));
      showToast('Contact supprimé', 'success');
    } catch (err: any) {
      showToast("Erreur suppression : " + stringifyError(err), 'error');
    }
  };

  const handleScoreContact = async (contact: Contact) => {
    if (!supabase) return;
    const toastId = showToast("Analyse IA en cours...", "info", 3000);
    try {
      // Utilisation du service centralisé
      const { scoreLead } = await import('../services/geminiService');

      const result = await scoreLead(contact);

      const scoredResult = {
        score: result.score,
        reason: result.reason,
        summary: result.summary
      };

      // Update Supabase
      const { error } = await supabase
        .from('contacts')
        .update({
          score: scoredResult.score,
          score_reason: scoredResult.reason
        })
        .eq('id', contact.id);

      if (error) throw error;

      // Ajouter l'analyse dans l'historique (interactions)
      await supabase
        .from('interactions')
        .insert([{
          contact_id: contact.id,
          type: 'note',
          content: `🤖 ANALYSE IA (Score: ${scoredResult.score}/100)\n\n${scoredResult.summary}`
        }]);

      showToast(`Scoring terminé : ${result.score}/100`, 'success');
      fetchContacts(); // Refresh list
    } catch (err: any) {
      console.error(err);
      showToast("Erreur scoring : " + stringifyError(err), 'error');
    }
  };

  const filteredContacts = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return contacts.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) ||
      (c.company || '').toLowerCase().includes(s)
    );
  }, [contacts, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 h-full flex flex-col">
      <div className="bg-white/80 backdrop-blur-2xl p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.04)] space-y-6 lg:space-y-8 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8">
          <div className="flex items-center gap-4 lg:gap-8">
            <div className={`w-14 h-14 lg:w-20 lg:h-20 rounded-2xl lg:rounded-[30px] bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white shadow-2xl rotate-3`}>
              <Users size={24} lg:size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl lg:text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                BASE DE DONNÉES <span className={`text-${themeColor}-600`}>{category === 'member' ? 'MEMBRES' : 'PROSPECTS'}</span>
              </h2>
              <p className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 lg:mt-2 italic flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full bg-${themeColor}-500 animate-pulse`}></div> Cloud Node v13.1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={fetchContacts} className="p-4 lg:p-5 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 rounded-xl lg:rounded-2xl transition-all shadow-sm active:scale-90">
              <RefreshCw size={18} lg:size={22} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="p-4 lg:p-5 bg-white border border-slate-100 text-slate-600 hover:text-emerald-600 rounded-xl lg:rounded-2xl transition-all shadow-sm active:scale-90"
              title="Importer CSV"
            >
              <Upload size={18} lg:size={22} />
            </button>
            <button
              onClick={() => { setEditingContact({ id: 'new' } as any); setIsModalOpen(true); }}
              className={`flex-1 lg:flex-none px-6 lg:px-10 py-4 lg:py-5 bg-gradient-to-r ${gradientClass} text-white rounded-2xl lg:rounded-[28px] font-black text-[10px] lg:text-[11px] uppercase tracking-[0.1em] lg:tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 lg:gap-3 transition-all hover:scale-[1.03] active:scale-[0.97] italic`}
            >
              <Plus size={16} lg:size={20} strokeWidth={4} /> Ajouter un {category}
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
            <input
              placeholder={`Rechercher un ${category}...`}
              className="w-full pl-12 pr-6 py-4 lg:py-5 bg-slate-50/50 border border-slate-100 rounded-2xl lg:rounded-[28px] text-[12px] lg:text-[13px] font-black uppercase tracking-tight italic outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white transition-all shadow-inner"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
        <ContactList
          contacts={filteredContacts}
          themeColor={themeColor}
          onEdit={(c) => { setEditingContact(c); setIsModalOpen(true); }}
          onDelete={executeDelete}
          onScore={handleScoreContact}
        />
      </div>

      {isModalOpen && editingContact && (
        <ContactFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingContact(null); }}
          contact={editingContact}
          category={category}
          onSuccess={() => {
            fetchContacts();
            setIsModalOpen(false);
            setEditingContact(null);
          }}
        />
      )}

      {showImportModal && (
        <ImportCSVModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          category={category}
          onSuccess={() => {
            fetchContacts();
          }}
        />
      )}
    </div>
  );
};

export default ContactManager;
