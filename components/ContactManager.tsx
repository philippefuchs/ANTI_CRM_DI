import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Contact, ProspectStatus } from '../types';
import {
  Plus, Search, Edit2, Trash2, X, Building2, Mail, Linkedin, RefreshCw,
  Check, Phone, Globe, Briefcase, Users, FileText, Trash, MapPin, AlignLeft,
  Upload, Download, UserPlus, Calendar, User, Target, Activity, ExternalLink, Info, Zap,
  Tag as TagIcon, Hash, Link as LinkIcon, Database, ArrowUpRight, FileSpreadsheet, Clock
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import InteractionTimeline from './InteractionTimeline';

interface ContactManagerProps {
  category: 'prospect' | 'member';
}

const ContactManager: React.FC<ContactManagerProps> = ({ category }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'agenda'>('info');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [contactEvents, setContactEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeColor = category === 'member' ? 'emerald' : 'indigo';
  const gradientClass = category === 'member' ? 'from-emerald-500 to-teal-600' : 'from-indigo-500 to-violet-600';

  const stringifyError = (err: any): string => {
    if (!err) return "Erreur inconnue";
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object') {
      const parts = [];
      if (err.message) parts.push(err.message);
      if (err.hint) parts.push(`Indice: ${err.hint} `);
      if (err.details) parts.push(`Détails: ${err.details} `);
      if (err.code) parts.push(`Code: ${err.code} `);

      if (parts.length > 0) return parts.join('\n');

      try {
        const json = JSON.stringify(err, null, 2);
        return json === '{}' ? String(err) : json;
      } catch (e) {
        return String(err);
      }
    }
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

  useEffect(() => {
    const fetchContactEvents = async () => {
      if (!editingContact || editingContact.id === 'new' || activeTab !== 'agenda' || !supabase) return;
      setLoadingEvents(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('contact_id', editingContact.id)
          .order('start_time', { ascending: true });
        if (error) throw error;
        setContactEvents(data || []);
      } catch (err) {
        console.error("Error fetching contact events:", err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchContactEvents();
  }, [editingContact, activeTab]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) return;

    const fd = new FormData(e.currentTarget);
    const tagsRaw = fd.get('tags')?.toString() || '';
    const tagsArray = tagsRaw.split(',').map(t => t.trim()).filter(t => t);

    const initialPayload: any = {
      first_name: fd.get('first_name')?.toString().trim() || null,
      last_name: fd.get('last_name')?.toString().trim() || null,
      company: fd.get('company')?.toString().trim() || null,
      title: fd.get('title')?.toString().trim() || null,
      sector: fd.get('sector')?.toString().trim() || null,
      website: fd.get('website')?.toString().trim() || null,
      email: fd.get('email')?.toString().toLowerCase().trim() || null,
      phone: fd.get('phone')?.toString().trim() || null,
      linkedin_url: fd.get('linkedin_url')?.toString().trim() || null,
      address: fd.get('address')?.toString().trim() || null,
      status: fd.get('status')?.toString() || (category === 'member' ? 'Active' : 'New'),
      tags: tagsArray,
      notes: fd.get('notes')?.toString().trim() || null,
      category: category,
    };

    const attemptSave = async (payload: any): Promise<{ success: boolean; error?: any }> => {
      let query: any = supabase.from('contacts');
      if (editingContact && editingContact.id !== 'new') {
        const sId = String(editingContact.id);
        const idToUse = (sId.includes('-') || isNaN(Number(sId))) ? sId : Number(sId);
        query = query.update(payload).eq('id', idToUse);
      } else {
        query = query.insert([payload]);
      }

      const { error } = await query;
      if (!error) return { success: true };

      const msg = error.message || "";

      // Cas de l'erreur UUID sur l'insertion
      if (msg.includes("invalid input syntax for type uuid") && editingContact?.id === 'new') {
        return attemptSave({ ...payload, id: crypto.randomUUID() });
      }

      const columnMatch = msg.match(/column "([^"]+)"/i) || msg.match(/'([^']+)' column/i);

      if (columnMatch && columnMatch[1]) {
        const missingColumn = columnMatch[1];
        console.warn(`Colonne '${missingColumn}' manquante dans Supabase.Retrait du payload.`);
        const nextPayload = { ...payload };
        delete nextPayload[missingColumn];

        const camelMapping: any = {
          first_name: 'firstName', last_name: 'lastName',
          linkedin_url: 'linkedinUrl', site_web: 'website'
        };
        if (camelMapping[missingColumn]) delete nextPayload[camelMapping[missingColumn]];

        if (Object.keys(nextPayload).length === 0) return { success: false, error };
        return attemptSave(nextPayload);
      }

      return { success: false, error };
    };

    try {
      const result = await attemptSave(initialPayload);
      if (result.error) throw result.error;

      await fetchContacts();
      setIsModalOpen(false);
      setEditingContact(null);
    } catch (err: any) {
      console.error("Master Save Error:", err);
      const msg = stringifyError(err);
      alert(`ERREUR DE SAUVEGARDE: \n\n${msg} `);
    }
  };

  const executeDelete = async (id: string) => {
    if (!supabase) return;
    try {
      const sId = String(id);
      const idToUse = (sId.includes('-') || isNaN(Number(sId))) ? sId : Number(sId);
      const { error } = await supabase.from('contacts').delete().eq('id', idToUse);
      if (error) throw error;
      setContacts(prev => prev.filter(c => c.id !== id));
      setPendingDeleteId(null);
    } catch (err: any) {
      alert("Erreur suppression :\n\n" + stringifyError(err));
    }
  };

  const handleDownloadTemplate = () => {
    // Using proper CSV format with Windows line breaks
    // Labels in French for better user experience
    const rows = [
      'Prénom,Nom,Email,Société,Titre,Téléphone,LinkedIn,Site_Web,Secteur,Adresse,Notes,Statut',
      'Jean,Dupont,jean.dupont@exemple.com,Acme Corp,Directeur,+33612345678,https://linkedin.com/in/jeandupont,https://acme.com,Technologie,Paris,Excellent contact,Nouveau',
      'Marie,Martin,marie.martin@exemple.com,Tech Solutions,CTO,+33698765432,,,SaaS,Lyon,Prospect intéressant,Contacté'
    ];
    const csvContent = '\uFEFF' + rows.join('\r\n'); // UTF-8 BOM + Windows line breaks

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = category === 'member' ? 'Modèle_Import_Membres.csv' : 'Modèle_Import_Prospects.csv';
    link.download = fileName;
    link.click();
  };

  const handleImportCSV = async () => {
    if (!importFile || !supabase) return;

    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        alert('Le fichier CSV est vide ou invalide');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const contacts: any[] = [];

      // Map French headers to DB fields
      const headerMap: { [key: string]: string } = {
        'Prénom': 'first_name',
        'Nom': 'last_name',
        'Email': 'email',
        'Société': 'company',
        'Titre': 'title',
        'Téléphone': 'phone',
        'LinkedIn': 'linkedin_url',
        'Site_Web': 'website',
        'Secteur': 'sector',
        'Adresse': 'address',
        'Notes': 'notes',
        'Statut': 'status'
      };

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const contact: any = { category };

        headers.forEach((header, index) => {
          const dbField = headerMap[header] || header;
          if (values[index]) {
            contact[dbField] = values[index];
          }
        });

        contacts.push(contact);
      }

      const { error } = await supabase.from('contacts').insert(contacts);

      if (error) throw error;

      alert(`${contacts.length} contact(s) importé(s) avec succès!`);
      await fetchContacts();
      setShowImportModal(false);
      setImportFile(null);
    } catch (err: any) {
      console.error('Error importing CSV:', err);
      alert(`Erreur d'import: ${err.message}`);
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
        {filteredContacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContacts.map(c => (
              <div key={c.id} className="bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col overflow-hidden relative group">
                {pendingDeleteId === c.id && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl z-[50] flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
                    <Trash2 size={40} className="text-white mb-6 animate-bounce" />
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">Supprimer ?</p>
                    <div className="flex gap-3 w-full">
                      <button onClick={() => executeDelete(c.id)} className="flex-1 py-4 bg-white text-rose-600 rounded-[20px] text-[11px] font-black uppercase shadow-xl italic">Oui</button>
                      <button onClick={() => setPendingDeleteId(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-[20px] text-[11px] font-black uppercase italic">Non</button>
                    </div>
                  </div>
                )}
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center border-4 border-slate-50 bg-slate-50 text-${themeColor}-500 shadow-inner group-hover:scale-110 transition-all duration-500`}>
                      <User size={30} strokeWidth={2.5} />
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border italic ${['Active', 'Closed', 'Interested'].includes(c.status)
                      ? `bg-${themeColor}-500 text-white border-${themeColor}-600`
                      : `bg-white text-slate-400 border-slate-100`
                      }`}>
                      {c.status || 'New'}
                    </span>
                  </div>
                  <div className="space-y-1 mb-6">
                    <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 truncate leading-none">{c.company || 'Enterprise'}</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic truncate">{c.firstName} {c.lastName}</p>
                    {c.title && <p className="text-[9px] font-black text-indigo-500/60 uppercase italic truncate">{c.title}</p>}
                  </div>
                </div>
                <div className="p-6 flex gap-3 bg-slate-50/30 border-t border-slate-100">
                  <button onClick={() => { setEditingContact(c); setIsModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-slate-900 hover:text-indigo-600 border border-slate-200 rounded-[20px] text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-sm italic active:scale-95"><Edit2 size={14} /> Profil</button>
                  <button onClick={() => setPendingDeleteId(c.id)} className="p-4 bg-white text-slate-300 hover:text-rose-500 border border-slate-200 rounded-[20px] transition-all active:scale-90"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-40 opacity-10 animate-pulse text-center space-y-8">
            <Database size={100} className="text-slate-900" />
            <p className="text-4xl font-black uppercase tracking-[0.8em] italic text-slate-900">BASE VIDE</p>
          </div>
        )}
      </div>

      {isModalOpen && editingContact && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-[#F8FAFC] w-full max-w-5xl rounded-[60px] shadow-2xl overflow-hidden animate-in zoom-in duration-500 flex flex-col max-h-[95vh] border-8 border-white">
            <div className="p-8 md:p-10 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-6 md:gap-8">
                <div className={`w-16 h-16 md:w-24 md:h-24 rounded-[24px] md:rounded-[36px] flex items-center justify-center shadow-2xl text-white rotate-6 bg-gradient-to-tr ${gradientClass}`}>
                  <UserPlus size={32} className="md:w-12 md:h-12" strokeWidth={3} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                    {editingContact.id === 'new' ? `Nouveau Profil` : `${editingContact.firstName} ${editingContact.lastName}`}
                  </h3>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2 italic flex items-center gap-2 md:gap-3">
                    <div className={`w-2 h-2 rounded-full bg-${themeColor}-500 animate-pulse`}></div>
                    Master Profile Configuration
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-4 md:p-5 text-slate-300 hover:bg-white hover:text-rose-600 rounded-[30px] transition-all active:scale-90">
                <X size={24} className="md:w-8 md:h-8" />
              </button>
            </div>

            {/* Tabs */}
            {editingContact.id !== 'new' && (
              <div className="px-8 md:px-10 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'info'
                      ? `text-${themeColor}-600 border-b-4 border-${themeColor}-500`
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info size={16} />
                      Informations
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'history'
                      ? `text-${themeColor}-600 border-b-4 border-${themeColor}-500`
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      Historique
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('agenda')}
                    className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'agenda'
                      ? `text-${themeColor}-600 border-b-4 border-${themeColor}-500`
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Agenda
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            {activeTab === 'info' && (
              <form ref={formRef} onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 md:space-y-10 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                  <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6 md:space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><User size={22} strokeWidth={3} /></div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">01. Identité</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Prénom</label>
                        <input required name="first_name" defaultValue={editingContact.firstName} className="w-full px-6 py-4 bg-slate-50 rounded-[24px] outline-none font-black italic text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all uppercase" placeholder="JOHN" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Nom</label>
                        <input required name="last_name" defaultValue={editingContact.lastName} className="w-full px-6 py-4 bg-slate-50 rounded-[24px] outline-none font-black italic text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all uppercase" placeholder="DOE" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Poste / Titre</label>
                      <input name="title" defaultValue={editingContact.title} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-sm uppercase" placeholder="CEO / FONDATEUR" />
                    </div>
                  </div>

                  <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6 md:space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Building2 size={22} strokeWidth={3} /></div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">02. Entreprise</h4>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Société</label>
                      <input required name="company" defaultValue={editingContact.company} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-sm uppercase" placeholder="CORP INC." />
                    </div>
                  </div>

                  <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6 md:space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Mail size={22} strokeWidth={3} /></div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">03. Contacts</h4>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Email</label>
                      <input type="email" name="email" defaultValue={editingContact.email} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black text-xs" placeholder="MAIL@PRO.COM" />
                    </div>
                  </div>

                  <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6 md:space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Target size={22} strokeWidth={3} /></div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">04. Qualification</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Statut CRM</label>
                        <select name="status" defaultValue={editingContact.status || (category === 'member' ? 'Active' : 'New')} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase cursor-pointer">
                          {['New', 'Contacted', 'Interested', 'Closed', 'Active', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Tags (virgules)</label>
                        <input name="tags" defaultValue={Array.isArray(editingContact.tags) ? editingContact.tags.join(', ') : editingContact.tags} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="URGENT, SaaS" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl"><AlignLeft size={22} strokeWidth={3} /></div>
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">05. Notes & Historique CRM</h4>
                  </div>
                  <textarea name="notes" defaultValue={editingContact.notes} rows={4} className="w-full px-6 md:px-8 py-4 md:py-6 bg-slate-50 rounded-[32px] outline-none font-medium text-sm border-2 border-transparent focus:border-indigo-100 transition-all resize-none shadow-inner italic" placeholder="NOTES CRITIQUES..." />
                </div>
              </form>
            )}

            {activeTab === 'history' && (
              <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                <InteractionTimeline
                  contactId={editingContact.id}
                  contactName={`${editingContact.firstName} ${editingContact.lastName}`}
                />
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black uppercase italic text-slate-900">Prochains Rendez-vous</h4>
                  <button
                    onClick={() => {
                      // Redirect to main calendar or open a schedule modal
                      // For now, prompt that they can do it in the main calendar
                      alert("Désolé, la prise de RDV directe depuis ce modal arrive bientôt ! Utilisez le module 'Calendrier' pour planifier.");
                    }}
                    className={`px-6 py-3 bg-gradient-to-r ${gradientClass} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg italic flex items-center gap-2`}
                  >
                    <Plus size={14} strokeWidth={4} /> Planifier
                  </button>
                </div>

                {loadingEvents ? (
                  <div className="flex justify-center py-20">
                    <RefreshCw className="animate-spin text-slate-300" size={40} />
                  </div>
                ) : contactEvents.length > 0 ? (
                  <div className="space-y-4">
                    {contactEvents.map(event => (
                      <div key={event.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-xl hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${new Date(event.start_time) < new Date() ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Calendar size={24} />
                          </div>
                          <div>
                            <p className="text-lg font-black italic uppercase text-slate-900">{event.title}</p>
                            <div className="flex items-center gap-3 mt-1 text-slate-400 text-xs font-bold uppercase tracking-widest">
                              <div className="flex items-center gap-1"><Clock size={12} /> {new Date(event.start_time).toLocaleDateString('fr-FR')}</div>
                              <div className="flex items-center gap-1"><Zap size={12} /> {new Date(event.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Détails Agenda
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-[0.4em] italic mb-4">Aucun rendez-vous planifié</p>
                    <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest underline italic">Fixer un RDV maintenant</button>
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="p-6 md:p-10 bg-white border-t-8 border-slate-50 flex gap-4 md:gap-6 z-20">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 md:py-6 bg-slate-100 text-slate-400 font-black uppercase text-[10px] rounded-[30px] hover:bg-slate-200 transition-all italic active:scale-95">Annuler</button>
              {activeTab === 'info' && (
                <button
                  type="button"
                  onClick={() => formRef.current?.requestSubmit()}
                  className={`flex-[2] py-4 md:py-6 text-white font-black uppercase text-[10px] rounded-[30px] transition-all shadow-xl flex items-center justify-center gap-4 active:scale-[0.98] italic bg-gradient-to-r ${gradientClass}`}
                >
                  <Check size={20} className="md:w-6 md:h-6" strokeWidth={5} /> {editingContact.id === 'new' ? 'Enregistrer' : 'Mettre à jour'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black uppercase italic text-slate-900">
                Importer des {category === 'member' ? 'Membres' : 'Prospects'}
              </h3>
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-200 rounded-[20px] p-4">
                <p className="text-xs font-bold text-indigo-900 mb-2">📋 Étape 1 : Télécharger le modèle</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Télécharger le modèle CSV
                </button>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-4">
                <p className="text-xs font-bold text-emerald-900 mb-2">📤 Étape 2 : Importer votre fichier</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-white border-2 border-emerald-300 text-emerald-700 rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  {importFile ? importFile.name : 'Sélectionner un fichier CSV'}
                </button>
              </div>

              {importFile && (
                <button
                  onClick={handleImportCSV}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-[20px] font-black uppercase text-sm tracking-widest hover:scale-[1.02] transition-all shadow-xl"
                >
                  Importer {importFile.name}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactManager;
