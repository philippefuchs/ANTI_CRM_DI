import React, { useState, useEffect, useRef } from 'react';
import { Contact } from '../types';
import { supabase } from '../services/supabase';
import { UserPlus, X, Info, Clock, Calendar, User, Building2, Mail, Target, AlignLeft, Plus, RefreshCw, Check, Zap } from 'lucide-react';
import InteractionTimeline from './InteractionTimeline';
import { useToast } from './ToastProvider';

interface ContactFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    contact: Contact;
    category: 'prospect' | 'member';
    onSuccess: () => void;
}

const ContactFormModal: React.FC<ContactFormModalProps> = ({ isOpen, onClose, contact, category, onSuccess }) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'agenda'>('info');
    const [contactEvents, setContactEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const themeColor = category === 'member' ? 'emerald' : 'indigo';
    const gradientClass = category === 'member' ? 'from-emerald-500 to-teal-600' : 'from-indigo-500 to-violet-600';

    useEffect(() => {
        const fetchContactEvents = async () => {
            if (!contact || contact.id === 'new' || activeTab !== 'agenda' || !supabase) return;
            setLoadingEvents(true);
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('contact_id', contact.id)
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
    }, [contact, activeTab]);

    const stringifyError = (err: any): string => {
        if (!err) return "Erreur inconnue";
        if (typeof err === 'string') return err;
        if (typeof err === 'object') return err.message || JSON.stringify(err);
        return String(err);
    };

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
            if (!supabase) return { success: false, error: "Database not configured" };

            let query: any = supabase.from('contacts');
            const isUpdate = contact && contact.id !== 'new';

            if (isUpdate) {
                const sId = String(contact.id);
                const idToUse = (sId.includes('-') || isNaN(Number(sId))) ? sId : Number(sId);
                query = query.update(payload).eq('id', idToUse);
            } else {
                // For NEW contacts, we try to let Supabase generate the ID first
                query = query.insert([payload]);
            }

            const { error } = await query;
            if (!error) return { success: true };

            // Fallback strategy if columns are missing
            const msg = error.message || "";
            if (msg.includes("column") || error.code === 'PGRST204' || msg.includes("structure")) {
                console.warn("Retrying save with data fallback...");
                const fallbackPayload = {
                    id: isUpdate ? undefined : (msg.includes("uuid") ? crypto.randomUUID() : undefined),
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                    email: payload.email,
                    company: payload.company,
                    category: payload.category,
                    data: { ...payload }
                };

                let retryQuery: any = supabase.from('contacts');
                if (isUpdate) {
                    const sId = String(contact.id);
                    const idToUse = (sId.includes('-') || isNaN(Number(sId))) ? sId : Number(sId);
                    retryQuery = retryQuery.update(fallbackPayload).eq('id', idToUse);
                } else {
                    retryQuery = retryQuery.insert([fallbackPayload]);
                }

                const { error: error2 } = await retryQuery;
                if (!error2) return { success: true };
                return { success: false, error: error2 };
            }

            // UUID fallback for new contacts
            if (msg.includes("uuid") && !isUpdate) {
                return attemptSave({ ...payload, id: crypto.randomUUID() });
            }

            return { success: false, error };
        };

        try {
            const result = await attemptSave(initialPayload);
            if (result.error) throw result.error;
            showToast('Contact enregistré avec succès', 'success');
            onSuccess();
            window.dispatchEvent(new CustomEvent('contact-updated')); // For real-time updates elsewhere if needed
            onClose();
        } catch (err: any) {
            console.error("Save Error:", err);
            showToast(`Erreur de sauvegarde : ${stringifyError(err)}`, 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in zoom-in duration-300">
            <div className="bg-[#F8FAFC] w-full max-w-5xl rounded-[60px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-8 border-white">
                <div className="p-8 md:p-10 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-6 md:gap-8">
                        <div className={`w-16 h-16 md:w-24 md:h-24 rounded-[24px] md:rounded-[36px] flex items-center justify-center shadow-2xl text-white rotate-6 bg-gradient-to-tr ${gradientClass}`}>
                            <UserPlus size={32} className="md:w-12 md:h-12" strokeWidth={3} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                                {contact.id === 'new' ? `Nouveau Profil` : `${contact.firstName} ${contact.lastName}`}
                            </h3>
                            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2 italic flex items-center gap-2 md:gap-3">
                                <div className={`w-2 h-2 rounded-full bg-${themeColor}-500 animate-pulse`}></div>
                                Master Profile Configuration
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 md:p-5 text-slate-300 hover:bg-white hover:text-rose-600 rounded-[30px] transition-all active:scale-90">
                        <X size={24} className="md:w-8 md:h-8" />
                    </button>
                </div>

                {contact.id !== 'new' && (
                    <div className="px-8 md:px-10 bg-white/80 backdrop-blur-md border-b border-slate-100">
                        <div className="flex gap-2">
                            {['info', 'history', 'agenda'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-6 py-4 font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab
                                        ? `text-${themeColor}-600 border-b-4 border-${themeColor}-500`
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {tab === 'info' && <Info size={16} />}
                                        {tab === 'history' && <Clock size={16} />}
                                        {tab === 'agenda' && <Calendar size={16} />}
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

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
                                        <input required name="first_name" defaultValue={contact.firstName} className="w-full px-6 py-4 bg-slate-50 rounded-[24px] outline-none font-black italic text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all uppercase" placeholder="JOHN" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Nom</label>
                                        <input required name="last_name" defaultValue={contact.lastName} className="w-full px-6 py-4 bg-slate-50 rounded-[24px] outline-none font-black italic text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all uppercase" placeholder="DOE" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Poste / Titre</label>
                                    <input name="title" defaultValue={contact.title} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-sm uppercase" placeholder="CEO / FONDATEUR" />
                                </div>
                            </div>

                            <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6 md:space-y-8">
                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Building2 size={22} strokeWidth={3} /></div>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">02. Entreprise</h4>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Société</label>
                                    <input required name="company" defaultValue={contact.company} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-sm uppercase shadow-sm focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="CORP INC." />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Secteur</label>
                                        <input name="sector" defaultValue={contact.sector} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="TECH, RETAIL..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Site Web</label>
                                        <input name="website" defaultValue={contact.website} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="WWW.CORP.COM" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6 md:space-y-8">
                                <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Mail size={22} strokeWidth={3} /></div>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">03. Contacts</h4>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Email</label>
                                    <input type="email" name="email" defaultValue={contact.email} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black text-xs shadow-sm focus:ring-4 focus:ring-rose-500/5 transition-all" placeholder="MAIL@PRO.COM" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Téléphone</label>
                                        <input name="phone" defaultValue={contact.phone} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="06..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">LinkedIn</label>
                                        <input name="linkedin_url" defaultValue={contact.linkedinUrl} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="LI/IN/USER..." />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Adresse</label>
                                    <input name="address" defaultValue={contact.address} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="RUE... VILLE..." />
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
                                        <select name="status" defaultValue={contact.status || (category === 'member' ? 'Active' : 'New')} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase cursor-pointer">
                                            {['New', 'Contacted', 'Interested', 'Closed', 'Active', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Tags (virgules)</label>
                                        <input name="tags" defaultValue={Array.isArray(contact.tags) ? contact.tags.join(', ') : contact.tags} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black italic text-xs uppercase" placeholder="URGENT, SaaS" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 md:p-10 rounded-[48px] shadow-sm border border-slate-50 space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                <div className="p-3 bg-slate-900 text-white rounded-2xl"><AlignLeft size={22} strokeWidth={3} /></div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">05. Notes & Historique CRM</h4>
                            </div>
                            <textarea name="notes" defaultValue={contact.notes} rows={4} className="w-full px-6 md:px-8 py-4 md:py-6 bg-slate-50 rounded-[32px] outline-none font-medium text-sm border-2 border-transparent focus:border-indigo-100 transition-all resize-none shadow-inner italic" placeholder="NOTES CRITIQUES..." />
                        </div>
                    </form>
                )}

                {activeTab === 'history' && (
                    <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                        <InteractionTimeline
                            contactId={contact.id}
                            contactName={`${contact.firstName} ${contact.lastName}`}
                        />
                    </div>
                )}

                {activeTab === 'agenda' && (
                    <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-xl font-black uppercase italic text-slate-900">Prochains Rendez-vous</h4>
                            <button
                                onClick={() => showToast("Désolé, la prise de RDV directe depuis ce modal arrive bientôt ! Utilisez le module 'Calendrier' pour planifier.", 'info')}
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

                <div className="p-6 md:p-10 bg-white border-t-8 border-slate-50 flex gap-4 md:gap-6 z-20">
                    <button type="button" onClick={onClose} className="flex-1 py-4 md:py-6 bg-slate-100 text-slate-400 font-black uppercase text-[10px] rounded-[30px] hover:bg-slate-200 transition-all italic active:scale-95">Annuler</button>
                    {activeTab === 'info' && (
                        <button
                            type="button"
                            onClick={() => formRef.current?.requestSubmit()}
                            className={`flex-[2] py-4 md:py-6 text-white font-black uppercase text-[10px] rounded-[30px] transition-all shadow-xl flex items-center justify-center gap-4 active:scale-[0.98] italic bg-gradient-to-r ${gradientClass}`}
                        >
                            <Check size={20} className="md:w-6 md:h-6" strokeWidth={5} /> {contact.id === 'new' ? 'Enregistrer' : 'Mettre à jour'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactFormModal;
