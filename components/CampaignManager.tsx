
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, Plus, Send, Trash2, X, Check, RefreshCw, Cloud, CheckCircle, Search,
  ChevronRight, Info, AlertTriangle, Tag as TagIcon, Target, BarChart, Bell,
  MousePointer, MessageCircle, UserCheck, UserX, Calendar, Users as UsersIcon,
  AlertCircle, HelpCircle, Minus, Plus as PlusIcon, Flag, ImageIcon, Users,
  Eraser, Sparkles, Zap, ChevronLeft, Filter, CheckSquare, Square, User, ArrowUpRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Campaign, Contact, ProspectStatus, CampaignOutcome, OutcomeDetail, EmailTemplate } from '../types';
import { BookOpen, Star } from 'lucide-react';

const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmLaunchId, setConfirmLaunchId] = useState<string | null>(null);
  const [libraryTemplates, setLibraryTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'prospect' | 'member'>('all');

  const [newCampaignData, setNewCampaignData] = useState({
    name: '',
    subject: 'Invitation Salon Professionnel',
    template: "Bonjour {{Prénom}},\n\nNous serions ravis de vous accueillir sur notre stand lors du prochain salon professionnel...",
    goal: 'Meeting' as 'Meeting' | 'Positive' | 'Event',
  });

  const stringifyError = (err: any): string => {
    if (!err) return "Erreur inconnue";
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object') {
      const parts = [];
      if (err.message) parts.push(err.message);
      if (err.details) parts.push(`Détails: ${err.details}`);
      if (err.hint) parts.push(`Indice: ${err.hint}`);
      if (err.code) parts.push(`Code: ${err.code}`);
      if (parts.length > 0) return parts.join('\n');
      try {
        return JSON.stringify(err, null, 2);
      } catch {
        return String(err);
      }
    }
    return String(err);
  };

  const formatIdForSupabase = (id: string | number) => {
    const sId = String(id || '').trim();
    if (!sId) return id;
    if (sId.includes('-')) return sId;
    return /^\d+$/.test(sId) && sId.length < 12 ? parseInt(sId, 10) : sId;
  };

  const loadAll = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: c, error: cErr } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (cErr) throw cErr;

      const { data: p, error: pErr } = await supabase.from('contacts').select('*');
      if (pErr) throw pErr;

      const savedConfig = localStorage.getItem('leadgen_emailjs_config');
      if (savedConfig) {
        setApiSettings(JSON.parse(savedConfig));
      } else {
        const { data: s } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
        if (s?.data) setApiSettings(s.data);
      }

      setCampaigns((c || []).map((item: any) => ({
        ...item,
        id: String(item.id),
        targetContactIds: Array.isArray(item.target_contact_ids || item.targetContactIds)
          ? (item.target_contact_ids || item.targetContactIds).map((id: any) => String(id))
          : [],
        outcomes: item.outcomes || {},
      })));

      setContacts((p || []).map((item: any) => ({
        ...item,
        id: String(item.id),
        firstName: (item.first_name || item.firstName || item.prenom || '').toString().trim(),
        lastName: (item.last_name || item.lastName || item.nom || '').toString().trim(),
        company: (item.company || item.societe || '').toString().trim(),
        email: (item.email || '').toString().trim().toLowerCase(),
        category: (item.category || 'prospect').toString().toLowerCase().trim()
      })));

      // Load templates from Library
      const stored = localStorage.getItem('leadgen_email_templates');
      if (stored) {
        setLibraryTemplates(JSON.parse(stored));
      }
    } catch (err: any) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) loadAll();
  }, [loadAll]);

  const currentCampaign = useMemo(() =>
    campaigns.find(c => c.id === selectedCampaignId),
    [campaigns, selectedCampaignId]);

  const currentTargets = useMemo(() => {
    if (!currentCampaign) return [];
    const tIds = currentCampaign.targetContactIds || [];
    return contacts.filter(c => tIds.includes(String(c.id)));
  }, [contacts, currentCampaign]);

  const updateOutcome = async (contactId: string, status: CampaignOutcome, attendees?: number) => {
    if (!selectedCampaignId || !supabase) return;

    try {
      const camp = campaigns.find(c => c.id === selectedCampaignId);
      if (!camp) return;

      const newOutcomes = {
        ...(camp.outcomes || {}),
        [contactId]: {
          status,
          attendees: attendees || (camp.outcomes?.[contactId]?.attendees || 0),
          updatedAt: new Date().toISOString()
        }
      };

      const idToUpdate = formatIdForSupabase(selectedCampaignId);
      const { error } = await supabase.from('campaigns').update({ outcomes: newOutcomes }).eq('id', idToUpdate);

      if (error) throw error;

      setCampaigns(prev => prev.map(c => c.id === selectedCampaignId ? { ...c, outcomes: newOutcomes } : c));
    } catch (err) {
      alert("Erreur de qualification : " + stringifyError(err));
    }
  };

  const currentFilteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchesSearch = (c.firstName + ' ' + c.lastName + ' ' + (c.company || '')).toLowerCase().includes(targetSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [contacts, categoryFilter, targetSearch]);

  const selectAllFiltered = () => {
    const ids = currentFilteredContacts.map(c => c.id);
    setSelectedTargetIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllFiltered = () => {
    const idsToRemove = currentFilteredContacts.map(c => c.id);
    setSelectedTargetIds(prev => prev.filter(id => !idsToRemove.includes(id)));
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignData.name.trim() || selectedTargetIds.length === 0) return;
    setIsCreating(true);

    const basePayload: any = {
      id: crypto.randomUUID(),
      name: newCampaignData.name.trim(),
      subject: newCampaignData.subject,
      template: newCampaignData.template,
      goal: newCampaignData.goal,
      status: 'Draft',
      channel: 'Email',
      sent: 0,
      replied: 0,
      opened: 0,
      outcomes: {},
      created_at: new Date().toISOString()
    };

    const attemptInsert = async (payload: any) => {
      let { error } = await supabase!.from('campaigns').insert([{ ...payload, target_contact_ids: selectedTargetIds }]);

      if (error) {
        if (error.message.includes('target_contact_ids') || error.code === 'PGRST204') {
          const { error: retryError } = await supabase!.from('campaigns').insert([{ ...payload, targetContactIds: selectedTargetIds }]);
          if (retryError) throw retryError;
        } else if (error.code === '22P02' || error.message.includes('uuid')) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.id;
          const { error: intError } = await supabase!.from('campaigns').insert([{ ...fallbackPayload, target_contact_ids: selectedTargetIds }]);
          if (intError) throw intError;
        } else {
          throw error;
        }
      }
    };

    try {
      await attemptInsert(basePayload);
      await loadAll();
      setIsModalOpen(false);
      setStep(1);
    } catch (err: any) {
      console.error("Create Campaign Error:", err);
      alert("Erreur de création :\n\n" + stringifyError(err));
    } finally {
      setIsCreating(false);
    }
  };

  const replacePlaceholders = (text: string, contact: Contact) => {
    if (!text) return '';
    const fn = contact.firstName || '';
    const ln = contact.lastName || '';
    const cp = contact.company || '';
    return text.replace(/\{\{Prénom\}\}/gi, fn).replace(/\{\{Nom\}\}/gi, ln).replace(/\{\{company\}\}/gi, cp);
  };

  const executeLaunch = async (campaign: Campaign) => {
    const savedConfig = localStorage.getItem('leadgen_emailjs_config');
    const configToUse = savedConfig ? JSON.parse(savedConfig) : apiSettings;

    if (!configToUse?.emailjsPublicKey || !configToUse?.emailjsServiceId || !configToUse?.emailjsTemplateId) {
      alert("Erreur : Configuration EmailJS incomplète dans Maintenance.");
      return;
    }

    const tIds = campaign.targetContactIds || [];
    const targets = contacts.filter(c => {
      const isTarget = tIds.includes(String(c.id));
      const hasEmail = c.email && c.email.length > 5 && c.email.includes('@');
      return isTarget && hasEmail;
    });

    if (targets.length === 0) {
      alert("Erreur : Aucun contact avec une adresse email valide n'a été trouvé.");
      return;
    }

    setIsSending(true);
    let successCount = 0;
    let lastError = null;
    const currentLogoUrl = localStorage.getItem('leadgen_app_logo') || "";

    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      if (!c.email || !c.email.includes('@')) continue;

      const payload: any = {
        service_id: configToUse.emailjsServiceId,
        template_id: configToUse.emailjsTemplateId,
        user_id: configToUse.emailjsPublicKey,
        template_params: {
          email: c.email.trim(), // Support pour template utilisant {{email}}
          to_email: c.email.trim(), // Support pour template utilisant {{to_email}}
          recipient_email: c.email.trim(), // Support pour template utilisant {{recipient_email}}
          to_name: `${c.firstName} ${c.lastName}`.trim(),
          recipient_name: `${c.firstName} ${c.lastName}`.trim(),
          firstName: c.firstName,
          lastName: c.lastName,
          company: c.company || '',
          subject: replacePlaceholders(campaign.subject || '', c),
          message: replacePlaceholders(campaign.template || '', c),
          from_name: configToUse.senderName || "LeadGen Pro",
          logo_url: currentLogoUrl,
          reply_to: configToUse.senderEmail || ''
        }
      };

      // Si un token d'accès (Clé Privée) est fourni, on l'ajoute au payload
      if (configToUse.emailjsAccessToken) {
        payload.accessToken = configToUse.emailjsAccessToken;
      }

      try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          successCount++;
        } else {
          const errorText = await res.text();
          lastError = `Status ${res.status}: ${errorText}`;
          console.error(`EmailJS Error for ${c.email}:`, errorText);
        }
      } catch (e: any) {
        lastError = e.message;
        console.error(`Fetch Error for ${c.email}:`, e);
      }
      setSendProgress(Math.round(((i + 1) / targets.length) * 100));
      await new Promise(r => setTimeout(r, 600));
    }

    if (successCount > 0) {
      try {
        const campaignId = formatIdForSupabase(campaign.id);
        const { error } = await supabase!.from('campaigns').update({
          status: 'Running',
          sent: successCount
        }).eq('id', campaignId);

        if (error) throw error;
        await loadAll();
        alert(`Succès : ${successCount} email(s) envoyé(s).`);
      } catch (updateErr: any) {
        alert("Attention : Emails envoyés mais mise à jour statut base échouée.\n\n" + stringifyError(updateErr));
      }
    } else {
      alert(`Échec de l'envoi.\n\nDétails : ${lastError || 'Vérifiez la validité des emails.'}\n\nCONSEIL : Vérifiez que le champ 'To Email' de votre template EmailJS contient bien {{email}} ou {{to_email}}.`);
    }

    setIsSending(false);
    setSendProgress(0);
    setConfirmLaunchId(null);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    try {
      await supabase.from('campaigns').delete().eq('id', formatIdForSupabase(id));
      setCampaigns(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-10 p-2 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm gap-8">
        <div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Workflows Engine</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-3 italic flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
            Cloud Sync v15.1 (Email Resolution Fix)
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadAll} className="p-5 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl hover:text-indigo-600 transition active:rotate-180">
            <RefreshCw size={22} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setIsModalOpen(true); setStep(1); setSelectedTargetIds([]); }}
            className="px-10 py-5 bg-slate-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center gap-4 transition hover:bg-indigo-600 active:scale-95 italic"
          >
            <Plus size={22} strokeWidth={3} /> Nouveau Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {campaigns.map(c => (
          <div key={c.id} className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col group relative transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
            <div className="absolute top-8 right-8 z-20">
              {confirmDeleteId === c.id ? (
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-3 bg-rose-600 text-white rounded-xl shadow-lg"><Check size={16} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="p-3 bg-slate-200 text-slate-600 rounded-xl"><X size={16} /></button>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(c.id); }} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
              )}
            </div>

            <div className="flex justify-between items-start mb-10">
              <div className="w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                <Mail size={30} strokeWidth={2.5} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border italic ${c.status === 'Running' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>{c.status}</span>
            </div>

            <div className="space-y-2 mb-8">
              <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter truncate leading-none">{c.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate italic">{c.subject || 'Sans objet'}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-10 mt-auto">
              <div className="flex flex-col"><span className="text-2xl font-black italic text-slate-900 leading-none">{c.sent || 0}</span><span className="text-[9px] font-black uppercase text-slate-400 mt-2 tracking-widest italic">Envoyés</span></div>
              <div className="flex flex-col items-end"><span className="text-2xl font-black italic text-indigo-600 leading-none">{(c.targetContactIds || []).length}</span><span className="text-[9px] font-black uppercase text-slate-400 mt-2 tracking-widest italic">Cibles</span></div>
            </div>

            <div className="space-y-4">
              {c.status === 'Draft' && (
                <div className="flex gap-2">
                  {confirmLaunchId === c.id ? (
                    <button onClick={() => executeLaunch(c)} className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl italic"><Send size={16} /> Confirmer ?</button>
                  ) : (
                    <button onClick={() => setConfirmLaunchId(c.id)} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl italic"><Send size={18} /> Lancer</button>
                  )}
                </div>
              )}
              {c.status === 'Running' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedCampaignId(c.id); setIsReturnModalOpen(true); }}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl italic relative z-10"
                >
                  <MessageCircle size={18} /> QUALIFIER
                </button>
              )}
              {c.status === 'Completed' && (
                <div className="w-full py-5 bg-slate-100 text-slate-400 rounded-[24px] font-black text-[11px] uppercase flex items-center justify-center gap-3 cursor-default italic"><CheckCircle size={18} /> Terminé</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL QUALIFICATION (RETOUR) */}
      {isReturnModalOpen && currentCampaign && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-[250] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[60px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-8 border-white animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-indigo-600 text-white flex items-center justify-center shadow-xl rotate-3">
                  {currentCampaign.goal === 'Event' ? <Calendar size={30} strokeWidth={3} /> : <MessageCircle size={30} strokeWidth={3} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Qualification {currentCampaign.goal === 'Event' ? 'Salon' : 'CRM'}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Workflow : {currentCampaign.name}</p>
                </div>
              </div>
              <button onClick={() => setIsReturnModalOpen(false)} className="p-4 bg-white text-slate-300 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-6">
              {currentTargets.length > 0 ? (
                currentTargets.map(target => {
                  const outcome = currentCampaign.outcomes?.[target.id];
                  const status = outcome?.status;
                  const attendees = outcome?.attendees || 0;
                  const isEvent = currentCampaign.goal === 'Event';

                  return (
                    <div key={target.id} className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-white hover:shadow-xl transition-all duration-500">
                      <div className="flex items-center gap-6 flex-1">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black italic text-lg shadow-lg ${status ? 'bg-emerald-500' : 'bg-slate-200 text-slate-400'}`}>
                          {target.firstName[0]}{target.lastName[0]}
                        </div>
                        <div>
                          <h4 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-none">{target.firstName} {target.lastName}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">{target.company || 'Sans société'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {isEvent ? (
                            <>
                              <button
                                onClick={() => updateOutcome(target.id, 'Registered', 1)}
                                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 border-2 ${status === 'Registered' ? 'bg-emerald-600 text-white border-transparent shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'}`}
                              >
                                <Check size={14} strokeWidth={4} /> OUI
                              </button>
                              <button
                                onClick={() => updateOutcome(target.id, 'Negative', 0)}
                                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 border-2 ${status === 'Negative' ? 'bg-rose-500 text-white border-transparent shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-rose-200'}`}
                              >
                                <UserX size={14} /> NON
                              </button>
                              <button
                                onClick={() => updateOutcome(target.id, 'None', 0)}
                                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 border-2 ${status === 'None' ? 'bg-amber-500 text-white border-transparent shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-amber-200'}`}
                              >
                                <HelpCircle size={14} /> NSP
                              </button>
                            </>
                          ) : (
                            <>
                              {[
                                { id: 'Meeting', label: 'RDV', icon: <Calendar size={14} />, color: 'bg-indigo-600' },
                                { id: 'Positive', label: 'Intérêt', icon: <Zap size={14} />, color: 'bg-amber-500' },
                                { id: 'Registered', label: 'Inscrit', icon: <UserCheck size={14} />, color: 'bg-emerald-600' },
                                { id: 'Negative', label: 'Refus', icon: <UserX size={14} />, color: 'bg-rose-500' }
                              ].map(opt => (
                                <button
                                  key={opt.id}
                                  onClick={() => updateOutcome(target.id, opt.id as any)}
                                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 border-2 ${status === opt.id ? `${opt.color} text-white border-transparent shadow-lg scale-105` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                                >
                                  {opt.icon} {opt.label}
                                </button>
                              ))}
                            </>
                          )}
                        </div>

                        {isEvent && status === 'Registered' && (
                          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm animate-in zoom-in duration-300">
                            <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest ml-2">Nombre de personnes :</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => updateOutcome(target.id, 'Registered', Math.max(1, attendees - 1))}
                                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <span className="text-lg font-black italic text-slate-900 min-w-[20px] text-center">{attendees}</span>
                              <button
                                onClick={() => updateOutcome(target.id, 'Registered', attendees + 1)}
                                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                              >
                                <PlusIcon size={14} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center space-y-4 opacity-30">
                  <UsersIcon size={64} className="mx-auto" />
                  <p className="text-[11px] font-black uppercase tracking-widest">Aucune cible à qualifier</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-50 bg-white flex justify-end">
              <button
                onClick={async () => {
                  await supabase!.from('campaigns').update({ status: 'Completed' }).eq('id', formatIdForSupabase(currentCampaign.id));
                  await loadAll();
                  setIsReturnModalOpen(false);
                }}
                className="px-10 py-5 bg-slate-900 text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-indigo-600 transition-all italic"
              >
                Terminer le Workflow <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATION (STEP BY STEP) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[60px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-8 border-white animate-in zoom-in">
            <div className="flex bg-slate-50 border-b p-4">
              {[
                { n: 1, l: 'Config' }, { n: 2, l: 'Ciblage' }, { n: 3, l: 'Message' }, { n: 4, l: 'Final' }
              ].map(s => (
                <div key={s.n} className={`flex-1 flex items-center justify-center gap-4 py-6 transition-all ${step === s.n ? 'opacity-100 scale-105' : 'opacity-30'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black italic text-sm ${step === s.n ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-300 text-white'}`}>{s.n}</div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] italic hidden md:block">{s.l}</span>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-12 custom-scrollbar">
              {step === 1 && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto space-y-12 py-10 text-center">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Identité Workflow</h2>
                      <p className="text-slate-400 text-sm font-medium">Nommez cette séquence de prospection.</p>
                    </div>
                    <input
                      value={newCampaignData.name}
                      onChange={e => setNewCampaignData({ ...newCampaignData, name: e.target.value })}
                      className="w-full px-12 py-10 bg-slate-50 border-2 border-transparent rounded-[48px] outline-none text-3xl font-black italic text-center uppercase focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                      placeholder="EX: PROSPECTION LILLE 2024"
                    />
                  </div>
                  <div className="pt-8 border-t border-slate-50 sticky bottom-0 bg-white z-10">
                    <button onClick={() => setStep(2)} className="w-full py-8 bg-slate-900 text-white rounded-[40px] font-black uppercase text-[12px] tracking-widest shadow-2xl disabled:opacity-20 transition-all italic flex items-center justify-center gap-4 group" disabled={!newCampaignData.name.trim()}>
                      Suivant <ChevronRight className="group-hover:translate-x-2 transition-transform" size={24} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                      <div className="flex p-2 bg-white rounded-[24px] shadow-sm border border-slate-100">
                        {[
                          { id: 'all', l: 'Tous', i: <UsersIcon size={14} /> },
                          { id: 'prospect', l: 'Prospects', i: <Target size={14} /> },
                          { id: 'member', l: 'Membres', i: <UserCheck size={14} /> }
                        ].map(btn => (
                          <button key={btn.id} onClick={() => setCategoryFilter(btn.id as any)} className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center gap-2 ${categoryFilter === btn.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                            {btn.i} {btn.l}
                          </button>
                        ))}
                      </div>
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        <input
                          placeholder="Filtrer..."
                          className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[24px] text-[12px] font-bold outline-none italic"
                          value={targetSearch}
                          onChange={e => setTargetSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center px-4 gap-4">
                      <div className="flex gap-4">
                        <button onClick={selectAllFiltered} className="text-[10px] font-black uppercase italic tracking-widest text-indigo-600 flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors border border-indigo-100"><CheckSquare size={16} /> Tout</button>
                        <button onClick={deselectAllFiltered} className="text-[10px] font-black uppercase italic tracking-widest text-rose-500 flex items-center gap-2 hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors border border-rose-100"><Square size={16} /> Aucun</button>
                      </div>
                      <p className="text-[10px] font-black uppercase text-slate-400 italic tracking-[0.2em]">{selectedTargetIds.length} SÉLECTIONNÉES</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentFilteredContacts.map(p => {
                        const isSelected = selectedTargetIds.includes(String(p.id));
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedTargetIds(prev => isSelected ? prev.filter(x => x !== String(p.id)) : [...prev, String(p.id)])}
                            className={`p-8 rounded-[40px] border-4 cursor-pointer transition-all duration-300 relative group overflow-hidden ${isSelected
                              ? 'bg-indigo-600 border-indigo-400 shadow-2xl scale-[1.02] z-10'
                              : p.category === 'member'
                                ? 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
                                : 'bg-indigo-50 border-indigo-100 hover:border-indigo-300'
                              }`}
                          >
                            <div className="flex items-center gap-5 relative z-10">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${isSelected
                                ? 'bg-white text-indigo-600'
                                : p.category === 'member' ? 'bg-emerald-500 text-white' : 'bg-indigo-500 text-white'
                                }`}>
                                {isSelected ? <Check size={28} strokeWidth={4} /> : <User size={24} />}
                              </div>
                              <div className="flex-1 truncate">
                                <p className={`text-[11px] font-black uppercase italic mb-1 ${isSelected
                                  ? 'text-indigo-200'
                                  : p.category === 'member' ? 'text-emerald-600' : 'text-indigo-600'
                                  }`}>{p.company || 'Sans société'}</p>
                                <p className={`text-lg font-black uppercase tracking-tighter italic leading-none ${isSelected ? 'text-white' : 'text-slate-900'
                                  }`}>{p.firstName} {p.lastName}</p>
                              </div>
                            </div>
                            {/* Petit badge type */}
                            {!isSelected && (
                              <div className={`absolute top-4 right-6 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${p.category === 'member' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>
                                {p.category === 'member' ? 'MEMBRE' : 'PROSPECT'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex justify-between items-center sticky bottom-0 bg-white z-10">
                    <button onClick={() => setStep(1)} className="px-10 py-5 text-slate-300 font-black uppercase italic tracking-widest flex items-center gap-2 hover:text-slate-600 transition-colors"><ChevronLeft size={20} /> Retour</button>
                    <button onClick={() => setStep(3)} disabled={selectedTargetIds.length === 0} className="px-16 py-6 bg-slate-900 text-white rounded-[32px] font-black text-[12px] uppercase tracking-widest shadow-2xl disabled:opacity-20 italic">Message <ChevronRight size={20} /></button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-500 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar pb-10">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-6">Objet de l'email</label>
                      <input value={newCampaignData.subject} onChange={e => setNewCampaignData({ ...newCampaignData, subject: e.target.value })} className="w-full px-10 py-8 bg-slate-50 border-2 border-transparent rounded-[32px] font-black italic outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase text-sm shadow-inner" placeholder="OBJET..." />
                    </div>
                    <div className="flex justify-between items-center px-6">
                      <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Corps du message (Variable : {"{{Prénom}}"})</label>
                      <button
                        onClick={() => setShowTemplateLibrary(!showTemplateLibrary)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase italic text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <BookOpen size={14} /> {showTemplateLibrary ? "Fermer la Bibliothèque" : "Choisir un Template"}
                      </button>
                    </div>

                    {showTemplateLibrary && (libraryTemplates.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 animate-in slide-in-from-top-4 duration-300">
                        {libraryTemplates.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => {
                              setNewCampaignData({ ...newCampaignData, subject: tpl.subject, template: tpl.body });
                              setShowTemplateLibrary(false);
                            }}
                            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-transparent hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
                              <Mail size={18} />
                            </div>
                            <div className="truncate">
                              <p className="text-[10px] font-black uppercase text-slate-900 italic truncate">{tpl.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{tpl.category}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea rows={10} value={newCampaignData.template} onChange={e => setNewCampaignData({ ...newCampaignData, template: e.target.value })} className="w-full px-10 py-10 bg-slate-50 border-2 border-transparent rounded-[48px] outline-none text-sm font-medium focus:border-indigo-500 focus:bg-white transition-all italic shadow-inner leading-relaxed" placeholder="Bonjour..." />
                  </div>
                  <div className="pt-8 flex justify-between items-center border-t border-slate-50 sticky bottom-0 bg-white z-10">
                    <button onClick={() => setStep(2)} className="text-[11px] font-black uppercase italic tracking-widest text-slate-300 hover:text-slate-600 transition-colors flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                    <button onClick={() => setStep(4)} className="px-16 py-6 bg-slate-900 text-white rounded-[32px] font-black text-[11px] uppercase tracking-widest shadow-2xl italic">Objectif <ChevronRight size={20} /></button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col h-full animate-in zoom-in duration-500 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-12 py-8 pr-2 custom-scrollbar pb-10">
                    <div className="space-y-3 text-center">
                      <h3 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 leading-none">Objectif final</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic opacity-70">Définissez le but de cette séquence</p>
                    </div>

                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { id: 'Meeting', l: 'Rendez-vous', i: <Calendar size={20} />, c: 'indigo' },
                        { id: 'Event', l: 'Salon Pro', i: <UsersIcon size={20} />, c: 'emerald' },
                        { id: 'Positive', l: 'Intérêt Pur', i: <UserCheck size={20} />, c: 'amber' }
                      ].map(goal => (
                        <div
                          key={goal.id}
                          className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-400 group relative flex items-center gap-4 ${newCampaignData.goal === goal.id
                            ? `bg-${goal.c}-50 border-${goal.c}-500 shadow-xl scale-[1.02]`
                            : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          onClick={() => setNewCampaignData({ ...newCampaignData, goal: goal.id as any })}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${newCampaignData.goal === goal.id
                            ? `bg-${goal.c}-600 text-white`
                            : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                            }`}>
                            {goal.i}
                          </div>
                          <div>
                            <h4 className={`text-[11px] font-black uppercase italic tracking-wider leading-none ${newCampaignData.goal === goal.id ? `text-${goal.c}-700` : 'text-slate-900 opacity-60'}`}>{goal.l}</h4>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-50">Sélectionner</p>
                          </div>
                          {newCampaignData.goal === goal.id && (
                            <div className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-${goal.c}-500 shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-12 flex justify-between items-center border-t border-slate-50 sticky bottom-0 bg-white z-10">
                    <button onClick={() => setStep(3)} className="text-[11px] font-black uppercase italic tracking-widest text-slate-300 hover:text-slate-600 transition-colors flex items-center gap-2"><ChevronLeft size={20} /> Retour</button>
                    <button onClick={handleCreateCampaign} disabled={isCreating} className="px-24 py-10 bg-emerald-500 text-white rounded-[48px] font-black text-[14px] uppercase tracking-widest shadow-2xl italic flex items-center gap-5 transition-all hover:bg-emerald-600">
                      {isCreating ? <RefreshCw className="animate-spin" size={24} /> : <Zap size={24} fill="currentColor" />} Finaliser
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY D'ENVOI */}
      {isSending && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[300] flex items-center justify-center">
          <div className="bg-slate-900 p-20 rounded-[80px] max-w-lg w-full text-center space-y-12 animate-in zoom-in border border-white/5">
            <div className="relative w-40 h-40 mx-auto">
              <RefreshCw size={120} className="text-indigo-500 opacity-20 animate-spin absolute inset-0 m-auto" />
              <Mail size={50} className="text-white absolute inset-0 m-auto animate-bounce" />
            </div>
            <div className="space-y-4">
              <h3 className="text-white text-4xl font-black uppercase italic tracking-tighter">Envoi : {sendProgress}%</h3>
              <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest italic animate-pulse">Neural Mail Gateway Active...</p>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-all duration-500" style={{ width: `${sendProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
