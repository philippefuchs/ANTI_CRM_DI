
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, Settings, Mail, Mic, Image as ImageIcon, Cpu, Activity, RefreshCw, Cloud, Link2, ShieldAlert, Copy, Save, Database, Upload, Trash2, HelpCircle, ExternalLink, AlertCircle, Check, Terminal, Code, Users, FileSpreadsheet, Zap, Scan, Key, Palette, Sparkles, Globe, BookOpen, Send, GitMerge, TrendingUp, FileText, Calendar, X
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ContactManager from './components/ContactManager';
import CampaignManager from './components/CampaignManager';
import VoiceAssistant from './components/VoiceAssistant';
import ProfileImageEditor from './components/ProfileImageEditor';
import ReportingManager from './components/ReportingManager';
import DataEnricher from './components/DataEnricher';
import CardScanner from './components/CardScanner';
import TemplateManager from './components/TemplateManager';
import DuplicateManager from './components/DuplicateManager';
import PipelineManager from './components/PipelineManager';
import CalendarManager from './components/CalendarManager';
import { checkUpcomingReminders, Reminder } from './services/reminderService';
import { supabase, isSupabaseConfigured, saveSupabaseConfig } from './services/supabase';
import { ToastProvider } from './components/ToastProvider';

type View = 'dashboard' | 'database' | 'members' | 'campaigns' | 'voice' | 'images' | 'reporting' | 'enricher' | 'scanner' | 'settings' | 'templates' | 'duplicates' | 'pipeline' | 'calendar';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(isSupabaseConfigured() ? 'dashboard' : 'settings');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLogoSyncing, setIsLogoSyncing] = useState(false);
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  const [activeVideo, setActiveVideo] = useState<{ title: string; url: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const defaultUrl = 'https://kdmdxljdegphjfgbxddd.supabase.co';
  const defaultKey = 'sb_publishable_xovJYj2nO1unZkskbQAhkQ_IrOdIB2V';

  const [supabaseCreds, setSupabaseCreds] = useState(() => {
    try {
      const saved = localStorage.getItem('leadgen_supabase_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { url: parsed.url || defaultUrl, key: parsed.key || defaultKey };
      }
    } catch (e) { console.error(e); }
    return { url: defaultUrl, key: defaultKey };
  });

  const [emailConfig, setEmailConfig] = useState({
    emailjsPublicKey: '',
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsAccessToken: '',
    senderName: ''
  });

  const stringifyError = (err: any): string => {
    if (!err) return "Erreur inconnue";
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object') {
      const parts = [];
      if (err.message) parts.push(err.message);
      if (err.hint) parts.push(`Indice: ${err.hint}`);
      if (err.details) parts.push(`Détails: ${err.details}`);
      if (err.code) parts.push(`Code: ${err.code}`);
      if (parts.length > 0) return parts.join('\n');
      try {
        const json = JSON.stringify(err, null, 2);
        return json === '{}' ? String(err) : json;
      } catch (e) { return String(err); }
    }
    return String(err);
  };

  const loadGlobalConfig = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const savedLogo = localStorage.getItem('leadgen_app_logo');
      if (savedLogo) {
        setAppLogo(savedLogo);
        if (savedLogo.startsWith('http')) setTempLogoUrl(savedLogo);
      }

      const { data, error } = await supabase!
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn("Erreur d'accès aux réglages");
        return;
      }

      if (data) {
        const remoteLogo = data.logo || data.logo_url || data.data?.logo || data.data?.logo_url;
        if (remoteLogo) {
          setAppLogo(remoteLogo);
          if (remoteLogo.startsWith('http')) setTempLogoUrl(remoteLogo);
          localStorage.setItem('leadgen_app_logo', remoteLogo);
        }

        const configFromDb = data.data || {
          emailjsPublicKey: data.emailjs_public_key || '',
          emailjsServiceId: data.emailjs_service_id || '',
          emailjsTemplateId: data.emailjs_template_id || '',
          emailjsAccessToken: data.emailjs_access_token || '',
          senderName: data.sender_name || ''
        };

        setEmailConfig(configFromDb);
        localStorage.setItem('leadgen_emailjs_config', JSON.stringify(configFromDb));
      }
    } catch (e) {
      console.error("Erreur chargement config:", e);
    }
  }, []);

  useEffect(() => {
    loadGlobalConfig();
  }, [loadGlobalConfig]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const runCheck = async () => {
      const newReminders = await checkUpcomingReminders();
      if (newReminders.length > 0) {
        setActiveReminders(prev => [...prev, ...newReminders]);
      }
    };

    runCheck();
    const interval = setInterval(runCheck, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const saveEmailConfig = async () => {
    if (!isSupabaseConfigured()) return;
    setIsSyncing(true);
    try {
      const payload: any = {
        id: 1,
        data: { ...emailConfig, logo: appLogo },
        emailjs_public_key: emailConfig.emailjsPublicKey,
        emailjs_service_id: emailConfig.emailjsServiceId,
        emailjs_template_id: emailConfig.emailjsTemplateId,
        emailjs_access_token: emailConfig.emailjsAccessToken,
        sender_name: emailConfig.senderName,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase!.from('app_settings').upsert(payload, { onConflict: 'id' });

      if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
        const fallbackPayload = { id: 1, data: { ...emailConfig, logo: appLogo }, updated_at: payload.updated_at };
        const { error: error2 } = await supabase!.from('app_settings').upsert(fallbackPayload, { onConflict: 'id' });
        if (error2) throw error2;
      } else if (error) throw error;

      localStorage.setItem('leadgen_emailjs_config', JSON.stringify(emailConfig));
      alert("Configuration sauvegardée !");
    } catch (e: any) {
      alert("Erreur : " + stringifyError(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        updateLogo(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateLogo = async (logoSource: string) => {
    setAppLogo(logoSource);
    localStorage.setItem('leadgen_app_logo', logoSource);

    if (isSupabaseConfigured()) {
      setIsLogoSyncing(true);
      try {
        const payload: any = {
          id: 1,
          logo: logoSource,
          logo_url: logoSource,
          data: { ...emailConfig, logo: logoSource },
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase!
          .from('app_settings')
          .upsert(payload, { onConflict: 'id' });

        if (error && (error.code === 'PGRST204' || error.message.includes('column'))) {
          const fallbackPayload = {
            id: 1,
            data: { ...emailConfig, logo: logoSource },
            updated_at: payload.updated_at
          };
          const { error: error2 } = await supabase!.from('app_settings').upsert(fallbackPayload, { onConflict: 'id' });
          if (error2) throw error2;
        } else if (error) throw error;

        if (logoSource.startsWith('http')) setTempLogoUrl(logoSource);

      } catch (err: any) {
        console.error("Logo sync error:", stringifyError(err));
      } finally {
        setIsLogoSyncing(false);
      }
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Analytics', icon: <BarChart3 size={20} />, color: 'from-blue-500 to-indigo-500' },
    { id: 'scanner', label: 'Scan Card', icon: <Scan size={20} />, color: 'from-amber-400 to-orange-500' },
    { id: 'enricher', label: 'IA Enrich', icon: <Zap size={20} />, color: 'from-fuchsia-500 to-purple-600' },
    { id: 'database', label: 'Prospects', icon: <Cloud size={20} />, color: 'from-indigo-500 to-blue-600' },
    { id: 'members', label: 'Membres', icon: <Users size={20} />, color: 'from-emerald-400 to-teal-600' },
    { id: 'duplicates', label: 'Doublons', icon: <GitMerge size={20} />, color: 'from-amber-500 to-orange-600' },
    { id: 'pipeline', label: 'Pipeline', icon: <TrendingUp size={20} />, color: 'from-violet-500 to-purple-600' },
    { id: 'calendar', label: 'Calendrier', icon: <Calendar size={20} />, color: 'from-indigo-500 to-violet-600' },
    { id: 'campaigns', label: 'Campagnes', icon: <Mail size={20} />, color: 'from-rose-500 to-pink-600' },
    { id: 'templates', label: 'E-mail Library', icon: <BookOpen size={20} />, color: 'from-amber-400 to-orange-500' },
    { id: 'reporting', label: 'Export', icon: <FileSpreadsheet size={20} />, color: 'from-slate-400 to-slate-600' },
    // { id: 'voice', label: 'IA Voice', icon: <Mic size={20} />, color: 'from-orange-400 to-red-500' },
    // { id: 'images', label: 'Studio', icon: <ImageIcon size={20} />, color: 'from-cyan-400 to-blue-500' },
    { id: 'settings', label: 'Maintenance', icon: <Settings size={20} />, color: 'from-slate-300 to-slate-500' },
  ];

  const currentLabel = navItems.find(item => item.id === currentView)?.label || currentView;

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#F0F4F8] font-sans text-slate-900 overflow-hidden font-jakarta bg-[url('https://res.cloudinary.com/dn67htk9u/image/upload/v1714995286/noise-light_csa6y2.png')] bg-repeat opacity-95">

        {/* Mobile Menu Overlay */}
        {activeVideo && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-12">
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl transition-all" onClick={() => setActiveVideo(null)}></div>
            <div className="relative w-full max-w-6xl aspect-video bg-black rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-8 right-8 z-10 p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md border border-white/10 transition-all active:scale-90"
              >
                <X size={24} />
              </button>
              <div className="absolute top-8 left-8 z-10 px-6 py-3 bg-indigo-500 text-white rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest italic">{activeVideo.title}</p>
              </div>
              <video
                controls
                autoPlay
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLVideoElement;
                  // Only show error message if all sources failed
                  if (target.networkState === 3) { // NETWORK_NO_SOURCE
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.video-error-msg')) {
                      const errorMsg = document.createElement('div');
                      errorMsg.className = 'absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-slate-900 video-error-msg';
                      errorMsg.innerHTML = `
                      <div class="p-6 bg-rose-500/10 text-rose-500 rounded-[32px] mb-6 border border-rose-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1-1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                      </div>
                      <h4 class="text-2xl font-black uppercase italic text-white mb-2">Vidéo Introuvable</h4>
                      <p class="text-slate-400 text-sm font-bold uppercase tracking-widest leading-relaxed max-w-md">
                        Le fichier "${activeVideo.url}" n'est pas encore disponible dans le dossier public/videos/
                      </p>
                    `;
                      parent.appendChild(errorMsg);
                    }
                  }
                }}
              >
                <source src={activeVideo.url.replace('.mp4', '.webp')} type="video/webp" />
                <source src={activeVideo.url} type="video/mp4" />
              </video>
            </div>
          </div>
        )}

        {/* Reminder Toasts */}
        <div className="fixed top-6 right-6 z-[500] pointer-events-none flex flex-col gap-4">
          {activeReminders.map(reminder => (
            <div key={reminder.id} className="pointer-events-auto bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl animate-in slide-in-from-right duration-500 max-w-sm border border-white/10 flex items-start gap-4 ring-1 ring-white/20">
              <div className="p-3 bg-indigo-500 rounded-2xl">
                <Zap size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1 italic">Rappel CRM</p>
                <h4 className="text-sm font-black italic uppercase leading-tight mb-1">{reminder.title}</h4>
                <p className="text-[10px] font-bold text-slate-400">
                  {reminder.contactName && `Avec ${reminder.contactName} • `}
                  {reminder.startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <button
                  onClick={() => setActiveReminders(prev => prev.filter(r => r.id !== reminder.id))}
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                >
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>
        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden transition-all duration-500"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        <aside className={`fixed lg:relative lg:flex w-80 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shrink-0 z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] transition-all duration-500 h-full ${isMobileMenuOpen ? 'left-0' : '-left-80 lg:left-0'
          }`}>
          <div className="p-8">
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-[32px] shadow-2xl shadow-indigo-500/30 rotate-1 w-24 h-24 flex items-center justify-center overflow-hidden border border-white/20 self-start">
                {appLogo ? (
                  <img src={appLogo} alt="Brand Logo" className="w-full h-full object-contain" />
                ) : (
                  <Cpu className="text-white" size={40} />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight italic leading-none text-slate-900">LeadGen <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Pro</span></h1>
                <div className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1 sm:mt-2 italic flex items-center gap-2 animate-pulse">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}></div>
                  {isSupabaseConfigured() ? 'Optimal Node' : 'Offline Mode'}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id as View);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-5 px-6 py-4.5 rounded-2xl transition-all duration-400 group relative ${isActive
                    ? 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                    }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full bg-gradient-to-b ${item.color} shadow-lg`}></div>
                  )}
                  <div className={`p-2.5 rounded-xl transition-all duration-500 ${isActive ? `bg-gradient-to-tr ${item.color} text-white shadow-md` : 'bg-slate-100 group-hover:scale-110'}`}>
                    {item.icon}
                  </div>
                  <span className={`uppercase tracking-[0.2em] text-[10px] font-black italic transition-all ${isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="p-8 border-t border-slate-100 bg-slate-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black italic text-indigo-600 shadow-sm overflow-hidden p-1.5">
                  {appLogo ? <img src={appLogo} className="w-full h-full object-contain" /> : 'LG'}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 uppercase italic">Version 15.1</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Email Gateway<br />Secured</p>
                </div>
              </div>
              <button onClick={() => setCurrentView('settings')} className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border border-slate-200 transition shadow-sm active:scale-90">
                <Settings size={18} />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-20 lg:h-24 px-6 lg:px-12 flex items-center justify-between bg-white/40 backdrop-blur-md border-b border-white/20 shrink-0 z-10">
            <div className="flex items-center gap-4 lg:gap-6">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-3 bg-white text-slate-600 rounded-xl border border-slate-200 shadow-sm active:scale-90 transition-all"
              >
                <Zap size={20} className="text-indigo-600" />
              </button>
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse hidden sm:block"></div>
              <h2 className="text-[13px] lg:text-[16px] font-black text-slate-900 uppercase tracking-[0.3em] lg:tracking-[0.5em] italic leading-none truncate">{currentLabel}</h2>
            </div>
            <div className="flex items-center gap-4 lg:gap-8">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Network Status</p>
                <p className="text-[11px] font-black text-emerald-600 uppercase italic flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Optimal Node</p>
              </div>
              <div className="h-8 lg:h-10 w-[1px] bg-slate-200/50 hidden sm:block"></div>
              <div className="w-10 lg:w-12 h-10 lg:h-12 rounded-xl lg:rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-100 group cursor-pointer active:scale-95 transition-all overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-violet-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <Activity size={18} className="text-indigo-500" />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
            <div className="max-w-[1600px] mx-auto h-full">
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'scanner' && <CardScanner />}
              {currentView === 'enricher' && <DataEnricher />}
              {currentView === 'database' && <ContactManager category="prospect" />}
              {currentView === 'members' && <ContactManager category="member" />}
              {currentView === 'duplicates' && <DuplicateManager />}
              {currentView === 'pipeline' && <PipelineManager />}
              {currentView === 'calendar' && <CalendarManager />}
              {currentView === 'campaigns' && <CampaignManager />}
              {currentView === 'templates' && <TemplateManager />}
              {currentView === 'reporting' && <ReportingManager />}
              {currentView === 'voice' && <VoiceAssistant />}
              {currentView === 'images' && <ProfileImageEditor />}
              {currentView === 'settings' && (
                <div className="p-8 max-w-4xl mx-auto space-y-12 pb-24">
                  {/* 1. CLOUD SYNC */}
                  <div className="bg-white rounded-[48px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl"><Link2 size={24} /></div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Backend Cloud</h3>
                          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">Supabase Neural Node v15.0</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 italic text-[10px] font-black uppercase tracking-widest">
                        <Cloud size={14} /> Ready
                      </div>
                    </div>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      saveSupabaseConfig(supabaseCreds.url, supabaseCreds.key);
                    }} className="p-10 space-y-8 bg-slate-50/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Project Endpoint</label>
                          <input value={supabaseCreds.url} onChange={e => setSupabaseCreds({ ...supabaseCreds, url: e.target.value })} className="w-full p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm shadow-sm focus:border-emerald-500 transition-all" placeholder="https://..." />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Service Key</label>
                          <input type="password" value={supabaseCreds.key} onChange={e => setSupabaseCreds({ ...supabaseCreds, key: e.target.value })} className="w-full p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm shadow-sm focus:border-emerald-500 transition-all" placeholder="KEY-AES-256" />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-emerald-600 transition-all active:scale-[0.98] italic flex items-center justify-center gap-3">
                        <RefreshCw size={18} /> Sync Cluster
                      </button>
                    </form>
                  </div>

                  {/* 2. BRAND IDENTITY */}
                  <div className="bg-white rounded-[48px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-10 border-b border-slate-50 flex items-center gap-6 bg-white">
                      <div className="p-4 bg-indigo-500/10 text-indigo-600 rounded-2xl"><Palette size={24} /></div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Identité de Marque</h3>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">Logo & Assets Manager</p>
                      </div>
                    </div>

                    <div className="p-10 bg-slate-50/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="relative group">
                          <div className="w-full aspect-square bg-white rounded-[40px] border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 p-4">
                            {appLogo ? (
                              <img src={appLogo} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon size={48} className="text-slate-200" />
                            )}
                            {isLogoSyncing && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                <RefreshCw size={32} className="animate-spin text-indigo-500" />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => logoInputRef.current?.click()}
                            className="absolute -bottom-4 -right-2 p-4 bg-indigo-600 text-white rounded-[20px] shadow-2xl hover:bg-indigo-700 transition-all active:scale-90"
                          >
                            <Upload size={18} />
                          </button>
                          <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </div>

                        <div className="md:col-span-2 space-y-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-slate-500 ml-2 tracking-widest">Lien Supabase du Logo</label>
                            <div className="flex gap-3">
                              <input
                                value={tempLogoUrl}
                                onChange={(e) => setTempLogoUrl(e.target.value)}
                                className="flex-1 p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-xs italic shadow-sm focus:border-indigo-500 transition-all"
                                placeholder="https://..."
                              />
                              <button
                                onClick={() => updateLogo(tempLogoUrl)}
                                disabled={isLogoSyncing || !tempLogoUrl}
                                className="px-6 bg-slate-100 text-slate-400 border border-slate-200 rounded-[24px] hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-30"
                              >
                                <Save size={18} />
                              </button>
                            </div>
                          </div>

                          <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-100/50 space-y-3">
                            <h4 className="text-[11px] font-black uppercase italic text-indigo-700 flex items-center gap-2">
                              <Sparkles size={14} /> Neural Display
                            </h4>
                            <p className="text-[10px] text-indigo-900/60 leading-relaxed font-bold">
                              Le logo configuré sera automatiquement optimisé et synchronisé sur tous vos terminaux via le cluster Supabase.
                            </p>
                            {appLogo && (
                              <button
                                onClick={() => { setAppLogo(null); setTempLogoUrl(''); localStorage.removeItem('leadgen_app_logo'); updateLogo(""); }}
                                className="text-indigo-400 text-[10px] font-black uppercase italic tracking-widest hover:text-rose-500 pt-2 transition-colors"
                              >
                                Réinitialiser l'image par défaut
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. EMAIL ENGINE */}
                  <div className="bg-white rounded-[48px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-rose-500/10 text-rose-600 rounded-2xl"><Mail size={24} /></div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Email Engine</h3>
                          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">Professional Integration</p>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full border border-rose-100 italic text-[10px] font-black uppercase tracking-widest">
                        Gateway Ready
                      </div>
                    </div>
                    <div className="p-10 space-y-8 bg-slate-50/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Public Key</label>
                          <input value={emailConfig.emailjsPublicKey} onChange={e => setEmailConfig({ ...emailConfig, emailjsPublicKey: e.target.value })} className="w-full p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm shadow-sm" placeholder="user_xxx" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Service ID</label>
                          <input value={emailConfig.emailjsServiceId} onChange={e => setEmailConfig({ ...emailConfig, emailjsServiceId: e.target.value })} className="w-full p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm shadow-sm" placeholder="service_xxx" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Template ID</label>
                          <input value={emailConfig.emailjsTemplateId} onChange={e => setEmailConfig({ ...emailConfig, emailjsTemplateId: e.target.value })} className="w-full p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm shadow-sm" placeholder="template_xxx" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-widest">Access Token</label>
                          <input type="password" value={emailConfig.emailjsAccessToken} onChange={e => setEmailConfig({ ...emailConfig, emailjsAccessToken: e.target.value })} className="w-full p-6 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm shadow-sm" placeholder="TOKEN-SECURE" />
                        </div>
                      </div>
                      <button onClick={saveEmailConfig} disabled={isSyncing} className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-rose-600 transition-all italic flex items-center justify-center gap-3">
                        {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Update Email Gateway
                      </button>
                    </div>
                  </div>

                  {/* 4. MANUEL UTILISATEUR */}
                  <div className="bg-slate-900 p-16 rounded-[64px] border border-slate-800 shadow-3xl text-white">
                    <div className="flex items-center gap-8 mb-16">
                      <div className="p-6 bg-indigo-500 text-white rounded-[32px] shadow-xl shadow-indigo-500/20 -rotate-3"><BookOpen size={40} /></div>
                      <div>
                        <h3 className="text-4xl font-black uppercase italic tracking-tighter">Guide Utilisateur</h3>
                        <p className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.5em] mt-3">Documentation Officielle LeadGen AI Pro</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-12">
                        <div className="space-y-4">
                          <h4 className="text-indigo-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <BarChart3 size={18} /> 01. Tableau de Bord
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Le centre de pilotage. Suivez en temps réel le nombre de <b className="text-white">Membres (Verts)</b>, de <b className="text-white">Leads (Bleus)</b> et de rendez-vous qualifiés. Vérifiez le point de synchronisation Cloud en haut à gauche.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-emerald-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <Users size={18} /> 02. Gestion Contacts
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Les <b className="text-white">Membres</b> sont vos partenaires actifs. Les <b className="text-white">Prospects</b> sont vos cibles. Utilisez le bouton "Ajouter" pour une création manuelle ou le scanneur de cartes pour l'automatisation.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-amber-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <GitMerge size={18} /> 03. Gestion Doublons
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Détectez automatiquement les contacts avec le même email. <b className="text-white">Fusionnez</b> les données ou <b className="text-white">supprimez</b> les doublons pour garder une base propre.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-violet-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <TrendingUp size={18} /> 04. Pipeline Commercial
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Vue <b className="text-white">Kanban</b> de vos opportunités. Glissez-déposez entre les étapes (Nouveau → Gagné/Perdu). Suivez la valeur et la probabilité de chaque deal en temps réel.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-12">
                        <div className="space-y-4">
                          <h4 className="text-amber-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <Send size={18} /> 05. Campagnes Email
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Créez des workflows en 4 étapes. Utilisez la <b className="text-white">Bibliothèque de Templates</b> pour gagner du temps. Définissez votre objectif (RDV, Salon, Intérêt) pour un suivi automatique précis.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-indigo-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <Sparkles size={18} /> 06. Intelligence Artificielle
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Le <b className="text-white">Scanneur IA</b> extrait les données des photos. <b className="text-white">IA Enrich</b> qualifie vos leads avec des infos contextuelles. Interaction mains-libres disponible.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-slate-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <FileText size={18} /> 07. Historique Interactions
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Timeline visuelle de toutes les interactions (emails, appels, réunions, notes). Accessible depuis le profil de chaque contact pour un suivi complet.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-indigo-400 text-[12px] font-black uppercase tracking-widest italic flex items-center gap-3">
                            <Calendar size={18} /> 08. Agenda & Rappels
                          </h4>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">
                            Planifiez vos rendez-vous et recevez des <b className="text-white">notifications intelligentes</b>. L'Agenda est partagé entre la vue Calendrier globale et les onglets dédiés dans chaque profil contact.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION VIDEOS DE DEMONSTRATION */}
                    {false && (<div className="mt-20 border-t border-slate-800/50 pt-16">
                      <div className="flex items-center gap-6 mb-12">
                        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20"><Activity size={24} /></div>
                        <div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tight">Vidéos de Démonstration</h3>
                          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1 italic">Exemples de workflows End-to-End</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div
                          onClick={() => setActiveVideo({ title: 'Cycle de Vente Complet', url: '/videos/sales-cycle.mp4' })}
                          className="group relative aspect-video bg-slate-800 rounded-[32px] border border-slate-700/50 flex items-center justify-center overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent group-hover:from-indigo-500/20 transition-all"></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                            <div className="w-20 h-20 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                              <ExternalLink size={32} />
                            </div>
                          </div>
                          <div className="relative text-center p-6 group-hover:opacity-20 transition-opacity">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                              <ExternalLink size={20} className="text-indigo-400" />
                            </div>
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-indigo-200 mb-2 italic">Tutoriel : Cycle de Vente Complet</h5>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Prospect → Enrichissement → Pipeline → RDV</p>
                          </div>
                        </div>

                        <div
                          onClick={() => setActiveVideo({ title: 'IA & Automatisation', url: '/videos/ai-automation.mp4' })}
                          className="group relative aspect-video bg-slate-800 rounded-[32px] border border-slate-700/50 flex items-center justify-center overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent group-hover:from-emerald-500/20 transition-all"></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                            <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                              <ExternalLink size={32} />
                            </div>
                          </div>
                          <div className="relative text-center p-6 group-hover:opacity-20 transition-opacity">
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                              <ExternalLink size={20} className="text-emerald-400" />
                            </div>
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-emerald-200 mb-2 italic">IA & Automatisation</h5>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Scan de cartes → CRM → Campagnes Automatisées</p>
                          </div>
                        </div>
                      </div>
                    </div>)}
                    <div className="mt-16 p-10 bg-slate-800/50 rounded-[40px] border border-slate-700/50 flex flex-col md:flex-row items-center gap-10">
                      <div className="p-6 bg-slate-900 rounded-3xl border border-slate-700 italic text-[11px] font-bold text-slate-400 text-center md:text-left flex-1">
                        Astuce Pro : Exportez vos listes au format <b className="text-indigo-400">CSV</b> depuis l'onglet "Reporting" pour vos comptes-rendus externes.
                      </div>
                      <div className="flex items-center gap-4 px-6 py-4 bg-indigo-500/10 rounded-[24px] border border-indigo-500/20">
                        <Zap size={20} className="text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Version 2.0 Stable - Phase 2</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};

export default App;
