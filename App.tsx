
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, Settings, Mail, Mic, Image as ImageIcon, Cpu, Activity, RefreshCw, Cloud, Link2, ShieldAlert, Copy, Save, Database, Upload, Trash2, HelpCircle, ExternalLink, AlertCircle, Check, Terminal, Code, Users, FileSpreadsheet, Zap, Scan, Key, Palette, Sparkles, Globe, BookOpen
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
import { supabase, isSupabaseConfigured, saveSupabaseConfig } from './services/supabase';

type View = 'dashboard' | 'database' | 'members' | 'campaigns' | 'voice' | 'images' | 'reporting' | 'enricher' | 'scanner' | 'settings' | 'templates';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(isSupabaseConfigured() ? 'dashboard' : 'settings');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLogoSyncing, setIsLogoSyncing] = useState(false);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
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
    { id: 'campaigns', label: 'Campagnes', icon: <Mail size={20} />, color: 'from-rose-500 to-pink-600' },
    { id: 'templates', label: 'E-mail Library', icon: <BookOpen size={20} />, color: 'from-amber-400 to-orange-500' },
    { id: 'reporting', label: 'Export', icon: <FileSpreadsheet size={20} />, color: 'from-slate-400 to-slate-600' },
    { id: 'voice', label: 'IA Voice', icon: <Mic size={20} />, color: 'from-orange-400 to-red-500' },
    { id: 'images', label: 'Studio', icon: <ImageIcon size={20} />, color: 'from-cyan-400 to-blue-500' },
    { id: 'settings', label: 'Maintenance', icon: <Settings size={20} />, color: 'from-slate-300 to-slate-500' },
  ];

  const currentLabel = navItems.find(item => item.id === currentView)?.label || currentView;

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden font-sans text-slate-800 relative">
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
              <div className="flex items-center gap-2 mt-3">
                <div className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{isSupabaseConfigured() ? 'Cloud Synchronized' : 'Offline Mode'}</p>
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
            {currentView === 'campaigns' && <CampaignManager />}
            {currentView === 'templates' && <TemplateManager />}
            {currentView === 'reporting' && <ReportingManager />}
            {currentView === 'voice' && <VoiceAssistant />}
            {currentView === 'images' && <ProfileImageEditor />}
            {currentView === 'settings' && (
              <div className="p-8 max-w-4xl mx-auto space-y-12 pb-24">
                {/* 1. CLOUD SYNC */}
                <div className="bg-white/70 backdrop-blur-2xl p-16 rounded-[64px] border border-white shadow-2xl">
                  <div className="flex items-center gap-8 mb-16">
                    <div className="p-6 bg-gradient-to-tr from-emerald-400 to-emerald-600 text-white rounded-[32px] shadow-xl shadow-emerald-500/20 rotate-3"><Link2 size={40} /></div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Backend Cloud</h3>
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] mt-3">Supabase Neural Node v14.5</p>
                    </div>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    saveSupabaseConfig(supabaseCreds.url, supabaseCreds.key);
                  }} className="space-y-12">
                    <div className="grid grid-cols-1 gap-12">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Project Endpoint</label>
                        <input value={supabaseCreds.url} onChange={e => setSupabaseCreds({ ...supabaseCreds, url: e.target.value })} className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[32px] outline-none font-black italic text-xl transition-all" placeholder="HTTPS://PROJECT.SUPABASE.CO" />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Master Service Key</label>
                        <input type="password" value={supabaseCreds.key} onChange={e => setSupabaseCreds({ ...supabaseCreds, key: e.target.value })} className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[32px] outline-none font-black italic text-xl transition-all" placeholder="MASTER-KEY" />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-8 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[32px] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl shadow-indigo-500/30 hover:scale-[1.02] transition-all italic flex items-center justify-center gap-4">
                      <RefreshCw size={24} /> Reconnect Cluster
                    </button>
                  </form>
                </div>

                {/* 2. BRAND IDENTITY (Logo Management) */}
                <div className="bg-white/70 backdrop-blur-2xl p-16 rounded-[64px] border border-white shadow-2xl">
                  <div className="flex items-center gap-8 mb-16">
                    <div className="p-6 bg-gradient-to-tr from-fuchsia-500 to-indigo-600 text-white rounded-[32px] shadow-xl shadow-fuchsia-500/20 rotate-3"><Palette size={40} /></div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Identité de Marque</h3>
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] mt-3">Logo & Assets Cloud</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="relative group">
                        <div className="w-full aspect-square bg-slate-50 rounded-[48px] border-4 border-white shadow-inner flex items-center justify-center overflow-hidden transition-all group-hover:shadow-2xl duration-500 p-2">
                          {appLogo ? (
                            <img src={appLogo} alt="Preview" className="w-full h-full object-contain" />
                          ) : (
                            <ImageIcon size={64} className="text-slate-200" />
                          )}
                          {isLogoSyncing && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                              <RefreshCw size={40} className="animate-spin mb-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Synchronisation...</span>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-6 right-6 flex gap-3">
                          <button
                            onClick={() => logoInputRef.current?.click()}
                            className="p-6 bg-slate-900 text-white rounded-[24px] shadow-2xl hover:bg-indigo-600 transition-all active:scale-90"
                            title="Uploader un fichier"
                          >
                            <Upload size={24} />
                          </button>
                        </div>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.5em]">Lien Supabase du Logo</label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <input
                              value={tempLogoUrl}
                              onChange={(e) => setTempLogoUrl(e.target.value)}
                              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[24px] outline-none font-bold text-sm italic pr-12"
                              placeholder="https://.../storage/v1/object/public/bucket/logo.png"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300"><Globe size={18} /></div>
                          </div>
                          <button
                            onClick={() => updateLogo(tempLogoUrl)}
                            disabled={isLogoSyncing || !tempLogoUrl}
                            className="px-8 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[10px] italic tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-30 transition-all"
                          >
                            {isLogoSyncing ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium px-4 leading-relaxed">
                          Copiez le lien public depuis votre **Bucket Supabase** (Storage) pour synchroniser votre identité sur tous vos terminaux.
                        </p>
                      </div>

                      <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 space-y-4">
                        <h4 className="text-[11px] font-black uppercase italic text-slate-900 flex items-center gap-2">
                          <Sparkles size={14} className="text-fuchsia-500" /> Aide au paramétrage
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                          Allez dans **Storage &gt; Buckets &gt; [votre bucket]**, cliquez sur votre logo, puis sur **"Copy URL"**. Collez le lien ci-dessus. Le logo s'affichera désormais à une taille optimisée pour une visibilité maximale.
                        </p>
                        {appLogo && (
                          <button
                            onClick={() => { setAppLogo(null); setTempLogoUrl(''); localStorage.removeItem('leadgen_app_logo'); updateLogo(""); }}
                            className="text-rose-500 text-[10px] font-black uppercase italic tracking-widest hover:underline pt-2"
                          >
                            Réinitialiser l'image par défaut
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. EMAIL ENGINE */}
                <div className="bg-white/70 backdrop-blur-2xl p-16 rounded-[64px] border border-white shadow-2xl">
                  <div className="flex items-center gap-8 mb-16">
                    <div className="p-6 bg-gradient-to-tr from-rose-400 to-rose-600 text-white rounded-[32px] shadow-xl shadow-rose-500/20 rotate-3"><Mail size={40} /></div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Email Engine</h3>
                      <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] mt-3">EmailJS Professional Integration</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Public Key (User ID)</label>
                      <input value={emailConfig.emailjsPublicKey} onChange={e => setEmailConfig({ ...emailConfig, emailjsPublicKey: e.target.value })} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[28px] outline-none font-bold italic text-sm" placeholder="user_xxxxxxxx" />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Service ID</label>
                      <input value={emailConfig.emailjsServiceId} onChange={e => setEmailConfig({ ...emailConfig, emailjsServiceId: e.target.value })} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[28px] outline-none font-bold italic text-sm" placeholder="service_xxxx" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Template ID</label>
                      <input value={emailConfig.emailjsTemplateId} onChange={e => setEmailConfig({ ...emailConfig, emailjsTemplateId: e.target.value })} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[28px] outline-none font-bold italic text-sm" placeholder="template_xxxx" />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-8 tracking-[0.5em]">Access Token (Private Key)</label>
                      <input type="password" value={emailConfig.emailjsAccessToken} onChange={e => setEmailConfig({ ...emailConfig, emailjsAccessToken: e.target.value })} className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[28px] outline-none font-bold italic text-sm" placeholder="Optional for most cases" />
                    </div>
                  </div>
                  <button onClick={saveEmailConfig} disabled={isSyncing} className="w-full mt-12 py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase text-[12px] tracking-[0.4em] shadow-xl hover:bg-rose-600 transition-all italic flex items-center justify-center gap-4 disabled:opacity-50">
                    {isSyncing ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
                    Save Email Gateway
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
