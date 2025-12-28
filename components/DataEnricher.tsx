
import React, { useState, useEffect } from 'react';
import { 
  Zap, RefreshCw, Save, UserCheck, Search, Mail, 
  Globe, Building2, UserPlus, Info, CheckCircle,
  FileText, Trash2, UserCircle, 
  ExternalLink, ShieldCheck, Phone,
  Link, AlertCircle, Fingerprint, Shield, Target, Contact, Info as InfoIcon
} from 'lucide-react';
import { enrichContactFromText } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { ProspectStatus } from '../types';

const DataEnricher: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "Analyse du prospect...",
    "Recherche d'emails professionnels...",
    "Localisation de lignes directes...",
    "Validation du site web entreprise...",
    "Finalisation du rapport de contact..."
  ];

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % steps.length);
      }, 1800); 
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleEnrich = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setSaveSuccess(false);
    setError(null);
    setResult(null);
    setSources([]);

    try {
      const response = await enrichContactFromText(inputText);
      if (response && response.data) {
        setResult(response.data);
        setSources(response.sources || []);
      } else {
        setError("Impossible de trouver des coordonnées certifiées.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la recherche approfondie.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToCRM = async (category: 'prospect' | 'member') => {
    if (!result || !supabase) return;
    setIsSaving(true);
    try {
      const payload = {
        first_name: result.firstName,
        last_name: result.lastName,
        company: result.company,
        title: result.title,
        email: result.email?.toLowerCase().trim(),
        phone: result.phone,
        website: result.website,
        sector: result.sector,
        category: category,
        status: category === 'member' ? 'Active' : ProspectStatus.NEW,
        notes: result.notes || `Enrichi via Contact Finder Pro (Confiance: ${result.matchConfidence})`
      };

      const { error } = await supabase.from('contacts').insert(payload);
      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => {
        setResult(null);
        setSources([]);
        setInputText('');
        setSaveSuccess(false);
      }, 1500);

    } catch (err: any) {
      alert("Erreur d'enregistrement : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const clear = () => {
    setInputText('');
    setResult(null);
    setSources([]);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 p-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-3">
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
             <Contact size={12} className="text-emerald-500" /> Lead Finder v8
           </div>
           <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Deep <span className="text-indigo-600">Enricher Pro</span></h2>
           <p className="text-sm font-medium text-slate-500 max-w-lg">Focus : Détection d'emails et téléphones professionnels (LinkedIn exclu pour plus de fiabilité).</p>
        </div>
        <div className="flex gap-4">
           <button onClick={clear} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-500 transition-all hover:shadow-md"><Trash2 size={20}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        
        {/* INPUT SECTION */}
        <div className="xl:col-span-5 space-y-6">
           <div className="bg-white p-8 rounded-[48px] border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-4 px-2">
                 <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Search size={20}/></div>
                 <h3 className="text-lg font-black uppercase italic tracking-tighter">Cible à identifier</h3>
              </div>
              
              <div className="relative">
                 <textarea 
                   rows={6}
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   className="w-full p-8 bg-slate-50 rounded-[40px] outline-none focus:ring-4 focus:ring-indigo-500/10 font-medium text-sm border border-slate-100 transition-all resize-none shadow-inner"
                   placeholder="Tapez : Prénom Nom Société (ex: Eric Fuchs MetroSwitch)"
                 />
                 {isProcessing && (
                   <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px] rounded-[40px] flex items-center justify-center overflow-hidden z-10">
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-[scan_2s_infinite] shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                      <div className="flex flex-col items-center gap-4 px-10 text-center">
                         <div className="relative">
                            <RefreshCw className="animate-spin text-indigo-600" size={56} />
                            <Target className="absolute inset-0 m-auto text-indigo-400" size={20} />
                         </div>
                         <div className="space-y-2">
                            <span className="text-[12px] font-black uppercase tracking-widest text-indigo-600 animate-pulse block">
                              {steps[loadingStep]}
                            </span>
                         </div>
                      </div>
                   </div>
                 )}
              </div>
              
              <button 
                onClick={handleEnrich}
                disabled={isProcessing || !inputText.trim()}
                className="w-full py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
              >
                <Zap className="group-hover:scale-110 transition-transform" size={20} />
                Lancer la recherche de coordonnées
              </button>

              {error && (
                <div className="p-5 bg-rose-50 text-rose-600 rounded-3xl border border-rose-100 flex items-center gap-3 animate-in shake duration-300">
                   <AlertCircle size={20} />
                   <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
                </div>
              )}
           </div>
        </div>

        {/* RESULT SECTION */}
        <div className="xl:col-span-7 space-y-6">
           <div className={`bg-white rounded-[56px] border border-slate-200 shadow-xl overflow-hidden transition-all duration-700 min-h-[500px] flex flex-col ${!result ? 'opacity-30 grayscale-[0.8] scale-[0.98]' : 'opacity-100'}`}>
              
              {/* CARD HEADER */}
              <div className="p-10 pb-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="flex items-center gap-8">
                      <div className="relative">
                        <div className={`w-28 h-28 rounded-[40px] flex items-center justify-center text-4xl font-black italic shadow-2xl border-4 border-white transition-all duration-500 ${result ? 'bg-emerald-600 text-white rotate-3 scale-110' : 'bg-slate-200 text-slate-400'}`}>
                           {result?.firstName?.[0] || '?'}{result?.lastName?.[0] || '?'}
                        </div>
                        {result?.matchConfidence === 'High' && (
                          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white animate-in zoom-in">
                            <ShieldCheck size={18} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-slate-900">
                           {result?.firstName || "Lead"} {result?.lastName || ""}
                        </h4>
                        <div className="flex items-center gap-3 pt-1">
                           <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                             {result?.title || "Poste à identifier"}
                           </span>
                           {result?.company && (
                             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">chez {result.company}</span>
                           )}
                        </div>
                      </div>
                   </div>
                   {result?.matchConfidence && (
                     <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border ${result.matchConfidence === 'High' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        Score de Fiabilité : {result.matchConfidence}
                     </div>
                   )}
                </div>
              </div>

              {/* CARD BODY */}
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6">
                   <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 border border-slate-100">
                      <Contact size={40} />
                   </div>
                   <div className="space-y-2">
                     <p className="text-lg font-black uppercase italic tracking-tighter text-slate-300">Discovery Engine v8</p>
                     <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Entrez une identité pour lancer l'OSINT</p>
                   </div>
                </div>
              ) : (
                <div className="flex-1 p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* EMAIL FOCUS */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Email Certifié</h5>
                         </div>
                         <div className="p-8 bg-emerald-50 rounded-[40px] border border-emerald-100 shadow-sm flex items-center gap-5">
                            <div className="p-4 bg-white text-emerald-600 rounded-2xl shadow-sm"><Mail size={24}/></div>
                            <div>
                               <p className="text-sm font-black text-slate-900 break-all">{result.email || "Non identifié"}</p>
                               <span className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Coordonnée Directe</span>
                            </div>
                         </div>
                      </div>

                      {/* PHONE FOCUS */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ligne Directe / Standard</h5>
                         </div>
                         <div className="p-8 bg-indigo-50 rounded-[40px] border border-indigo-100 shadow-sm flex items-center gap-5">
                            <div className="p-4 bg-white text-indigo-600 rounded-2xl shadow-sm"><Phone size={24}/></div>
                            <div>
                               <p className="text-sm font-black text-slate-900">{result.phone || "Non spécifié"}</p>
                               <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Contact Téléphonique</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entreprise</h5>
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                               <Building2 className="text-slate-300" size={18}/>
                               <p className="text-[11px] font-black text-slate-900 truncate">{result.company || "Non détecté"}</p>
                            </div>
                            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                               <Globe className="text-slate-300" size={18}/>
                               <p className="text-[11px] font-black text-slate-900 truncate">{result.website || "Site web inconnu"}</p>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-amber-400 rounded-full"></div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notes d'Identification</h5>
                         </div>
                         <div className="p-6 bg-amber-50 rounded-[32px] border border-amber-100 h-full">
                            <div className="flex gap-3">
                               <InfoIcon size={16} className="text-amber-500 shrink-0" />
                               <p className="text-[11px] font-medium text-amber-900 leading-relaxed italic">
                                 {result.notes || "Aucune note complémentaire de la part du moteur de recherche."}
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* SOURCES */}
                   {sources.length > 0 && (
                     <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Link size={12}/> Sources Identifiées (Validation Web)
                        </p>
                        <div className="flex flex-wrap gap-2">
                           {sources.slice(0, 3).map((s, idx) => (
                             <a 
                               key={idx} 
                               href={s.uri} 
                               target="_blank" 
                               rel="noopener noreferrer" 
                               className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                             >
                               <Globe size={10}/> {s.title.length > 40 ? s.title.substring(0, 40) + '...' : s.title}
                             </a>
                           ))}
                        </div>
                     </div>
                   )}

                   {/* ACTION BUTTONS */}
                   <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 mt-auto">
                      <button 
                        onClick={() => handleSaveToCRM('prospect')}
                        disabled={isSaving}
                        className="py-6 bg-slate-900 text-white rounded-[32px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-30"
                      >
                         <UserPlus size={20} /> Ajouter aux Prospects
                      </button>
                      <button 
                        onClick={() => handleSaveToCRM('member')}
                        disabled={isSaving}
                        className="py-6 bg-emerald-600 text-white rounded-[32px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl active:scale-95 disabled:opacity-30"
                      >
                         <UserCheck size={20} /> Valider comme Membre
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DataEnricher;
