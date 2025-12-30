
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, LabelList, Legend } from 'recharts';
import { Users, RefreshCw, Ticket, Briefcase, Globe, Activity, TrendingUp, CheckCircle2, UserCircle, LayoutGrid, Clock, ShieldCheck, Calendar, Zap, Sparkles, HelpCircle, UserX } from 'lucide-react';
import { Contact, Campaign, ProspectStatus, OutcomeDetail } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const Dashboard: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);
  const [statsCategory, setStatsCategory] = useState<'prospect' | 'member'>('member');
  const [lastSync, setLastSync] = useState<string>(new Date().toLocaleTimeString());

  const loadData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsChartReady(false);

    // Safety timeout: stop loading after 8 seconds anyway
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    try {
      const { data: contactsData, error: contactsErr } = await supabase.from('contacts').select('*');
      const { data: campaignsData, error: campaignsErr } = await supabase.from('campaigns').select('*');

      if (contactsErr) console.warn("Supabase contacts error:", contactsErr);
      if (campaignsErr) console.warn("Supabase campaigns error:", campaignsErr);

      if (contactsData) {
        const normalizedContacts = (contactsData as any[]).map(c => ({
          ...c,
          id: String(c.id),
          category: (c.category || 'prospect').toString().toLowerCase().trim(),
          status: (c.status || '').toString().trim(),
          sector: c.sector || c.data?.sector || 'Inconnu'
        }));
        setContacts(normalizedContacts);
      } else {
        setContacts([]);
      }

      if (campaignsData) {
        setCampaigns((campaignsData as any[]).map(camp => ({
          ...camp,
          id: String(camp.id),
          outcomes: camp.outcomes || {}
        })));
      } else {
        setCampaigns([]);
      }

      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Erreur analytics:", error);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured()) loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const prospects = useMemo(() => contacts.filter(c => c.category === 'prospect'), [contacts]);
  const members = useMemo(() => contacts.filter(c => c.category === 'member'), [contacts]);

  const totalLeads = prospects.length;
  const totalMembers = members.length;

  const currentCategoryData = useMemo(() =>
    statsCategory === 'member' ? members : prospects
    , [statsCategory, members, prospects]);

  const activeMembers = useMemo(() =>
    members.filter(m => {
      const s = m.status;
      return [ProspectStatus.ACTIVE, ProspectStatus.CLOSED, ProspectStatus.INTERESTED].includes(s as ProspectStatus);
    }),
    [members]);

  const newMembers = useMemo(() =>
    members.filter(m => m.status === ProspectStatus.NEW),
    [members]);

  const campaignStats = useMemo(() => {
    let registered = 0;
    let meetings = 0;
    let positive = 0;
    let negative = 0;
    let nsp = 0;
    const nspContactIds = new Set<string>();
    const negativeContactIds = new Set<string>();

    campaigns.forEach(camp => {
      if (camp.outcomes) {
        Object.entries(camp.outcomes).forEach(([cid, o]: [string, any]) => {
          const outcome = o as OutcomeDetail;
          if (outcome.status === 'Registered') registered += (outcome.attendees || 1);
          if (outcome.status === 'Meeting') meetings++;
          if (outcome.status === 'Positive') positive++;
          if (outcome.status === 'Negative') {
            negative++;
            negativeContactIds.add(cid);
          }
          if (outcome.status === 'None') {
            nsp++;
            nspContactIds.add(cid);
          }
        });
      }
    });
    return { registered, meetings, positive, negative, nsp, nspContactIds, negativeContactIds };
  }, [campaigns]);

  const sectorsData = useMemo(() => {
    const sectors: Record<string, number> = {};
    const total = currentCategoryData.length || 1;
    currentCategoryData.forEach(c => {
      const s = (c.sector || 'Inconnu').trim() || 'Inconnu';
      sectors[s] = (sectors[s] || 0) + 1;
    });
    return Object.entries(sectors)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / total) * 100).toFixed(1),
        display: `${((value / total) * 100).toFixed(0)}%`
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [currentCategoryData]);

  const pieData = useMemo(() => {
    const total = totalMembers || 1;
    const nspInMembers = members.filter(m => campaignStats.nspContactIds.has(m.id)).length;
    const negInMembers = members.filter(m => campaignStats.negativeContactIds.has(m.id)).length;

    return [
      { name: 'Qualifiés / Actifs', value: activeMembers.length, percentage: `${((activeMembers.length / total) * 100).toFixed(1)}%`, color: '#10b981' },
      { name: 'Refusés (NON)', value: negInMembers, percentage: `${((negInMembers / total) * 100).toFixed(1)}%`, color: '#f43f5e' },
      { name: 'Nouveaux', value: newMembers.length, percentage: `${((newMembers.length / total) * 100).toFixed(1)}%`, color: '#6366f1' },
      { name: 'À Relancer (NSP)', value: nspInMembers, percentage: `${((nspInMembers / total) * 100).toFixed(1)}%`, color: '#94a3b8' },
    ];
  }, [totalMembers, activeMembers.length, newMembers.length, campaignStats.nspContactIds, campaignStats.negativeContactIds, members]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
      <RefreshCw className="text-indigo-600 animate-spin" size={48} />
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 italic animate-pulse">Synchronisation Cloud en cours...</p>
    </div>
  );

  return (
    <div className="space-y-4 lg:space-y-10 p-1 lg:p-2 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 lg:p-8 rounded-[32px] lg:rounded-[40px] border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3 lg:gap-5">
          <div className="bg-emerald-500 p-2.5 lg:p-4 rounded-xl lg:rounded-2xl text-white shadow-lg shadow-emerald-100"><TrendingUp size={18} lg:size={20} /></div>
          <div>
            <h3 className="text-sm lg:text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Intelligence Analytics</h3>
            <div className="flex items-center gap-2 mt-1 lg:mt-1.5 bg-slate-50 px-2 py-0.5 lg:py-1 rounded-full w-fit border border-slate-100">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[7px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">Sync : <span className="text-slate-900">{lastSync}</span></p>
            </div>
          </div>
        </div>
        <button onClick={loadData} className="self-end sm:self-auto p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition border border-transparent hover:border-slate-200 active:scale-95"><RefreshCw size={16} /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 lg:gap-6">
        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-emerald-500 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-emerald-100 w-fit"><Users size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">Membres</h3>
          <p className="text-lg lg:text-4xl font-black italic text-emerald-600 tracking-tighter leading-none">{totalMembers}</p>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-indigo-100 w-fit"><Activity size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">Leads</h3>
          <p className="text-lg lg:text-4xl font-black italic tracking-tighter text-indigo-600 leading-none">{totalLeads}</p>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-violet-600 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-violet-100 w-fit"><Calendar size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">RDV</h3>
          <p className="text-lg lg:text-4xl font-black italic text-violet-600 tracking-tighter leading-none">{campaignStats.meetings}</p>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-fuchsia-600 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-fuchsia-100 w-fit"><Zap size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">Pistes</h3>
          <p className="text-lg lg:text-4xl font-black italic text-fuchsia-600 tracking-tighter leading-none">{campaignStats.positive}</p>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-rose-500 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-rose-100 w-fit"><UserX size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">Refus (NON)</h3>
          <p className="text-lg lg:text-4xl font-black italic text-rose-600 tracking-tighter leading-none">{campaignStats.negative}</p>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-slate-400 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-slate-200 w-fit"><HelpCircle size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">Incertains</h3>
          <p className="text-lg lg:text-4xl font-black italic text-slate-600 tracking-tighter leading-none">{campaignStats.nsp}</p>
        </div>

        <div className="bg-white p-4 lg:p-8 rounded-[28px] lg:rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl mb-3 lg:mb-6 shadow-lg shadow-amber-100 w-fit"><Ticket size={18} /></div>
          <h3 className="text-[7px] lg:text-[11px] font-bold uppercase text-slate-400 tracking-widest mb-1">Salon</h3>
          <p className="text-lg lg:text-4xl font-black italic text-amber-500 tracking-tighter leading-none">{campaignStats.registered}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] border border-slate-200 shadow-sm flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-6">
            <div>
              <h3 className="text-sm lg:text-lg font-black uppercase italic tracking-tighter text-slate-900">Distribution</h3>
              <p className="text-[8px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Répartition incluant les refus</p>
            </div>
            <div className="p-2 lg:p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm"><Activity size={16} /></div>
          </div>

          <div className="w-full h-[250px] lg:h-[300px] relative bg-slate-50/30 rounded-[32px] lg:rounded-[40px] overflow-hidden">
            {isChartReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [`${value} (${props.payload.percentage})`, name]}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full w-full flex items-center justify-center"><RefreshCw size={24} className="animate-spin text-slate-200" /></div>}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl lg:text-4xl font-black italic text-slate-900 leading-none">{totalMembers}</span>
              <span className="text-[7px] lg:text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Membres</span>
            </div>
          </div>

          <div className="w-full mt-6 space-y-2.5 px-2">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-500">{item.name}</span>
                </div>
                <span className="text-[9px] lg:text-[11px] font-black italic text-slate-900">{item.percentage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 lg:p-10 rounded-[32px] lg:rounded-[48px] border border-slate-200 shadow-sm min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm lg:text-lg font-black uppercase italic tracking-tighter text-slate-900">Secteurs Porteurs</h3>
              <p className="text-[8px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Top 5 segmentation</p>
            </div>
            <div className="flex p-1 bg-slate-100 rounded-xl lg:rounded-2xl">
              <button onClick={() => setStatsCategory('member')} className={`px-4 lg:px-6 py-2 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase transition-all ${statsCategory === 'member' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Membres</button>
              <button onClick={() => setStatsCategory('prospect')} className={`px-4 lg:px-6 py-2 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase transition-all ${statsCategory === 'prospect' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Leads</button>
            </div>
          </div>
          <div className="w-full h-[280px] lg:h-[320px] bg-slate-50/30 rounded-[32px] lg:rounded-[40px] overflow-hidden p-4 lg:p-8">
            {isChartReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorsData} layout="vertical" margin={{ left: 10, right: 60, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                    width={90}
                  />
                  <Bar
                    dataKey="value"
                    fill={statsCategory === 'member' ? '#10b981' : '#6366f1'}
                    radius={[0, 10, 10, 0]}
                    barSize={20}
                  >
                    <LabelList dataKey="display" position="right" offset={10} style={{ fontSize: '9px', fontWeight: '800', fill: '#475569' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full w-full flex items-center justify-center"><RefreshCw size={24} className="animate-spin text-slate-200" /></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
