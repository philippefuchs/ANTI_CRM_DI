
import React, { useState, useEffect } from 'react';
import {
    Mail, Save, Plus, Trash2, Edit3, CheckCircle, Code, Eye, X,
    ChevronRight, Sparkles, BookOpen, Send, Target, Zap,
    Calendar, Users, Info, Copy, FileText, Globe
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { EmailTemplate } from '../types';

const PREDEFINED_TEMPLATES: Omit<EmailTemplate, 'id' | 'createdAt'>[] = [
    {
        name: "Invitation Salon Professionnel (Standard)",
        category: "Event",
        subject: "Invitation : Venez nous rencontrer au prochain salon !",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Nous sommes ravis de vous inviter à venir nous rencontrer lors du prochain <strong>salon professionnel</strong> qui se tiendra prochainement.</p>
  
  <p>C'est l'occasion idéale pour échanger sur vos projets au sein de <strong>{{company}}</strong> et vous présenter nos dernières innovations qui pourraient transformer votre activité.</p>
  
  <div style="background-color: #f7f9fc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
    <p style="margin: 0; font-weight: bold;">📍 Retrouvez-nous sur notre stand pour une démonstration personnalisée.</p>
  </div>
  
  <p>Souhaitez-vous que nous bloquions un créneau de 15 minutes pour vous ?</p>
  
  <p>À très bientôt,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Suite à visite Stand (Relance Rapide)",
        category: "Follow-up",
        subject: "Ravi d'avoir échangé avec vous au salon !",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Ce fut un plaisir d'échanger avec vous sur notre stand aujourd'hui à propos de <strong>{{company}}</strong>.</p>
  
  <p>Comme convenu, je vous envoie les informations complémentaires sur les solutions dont nous avons discuté. Je serais ravi de poursuivre notre discussion par un court appel la semaine prochaine.</p>
  
  <p>Quelles seraient vos disponibilités ?</p>
  
  <p>Bien cordialement,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Prise de contact Partenariat",
        category: "Partnership",
        subject: "Opportunité de partenariat avec {{company}}",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Je suis votre activité chez <strong>{{company}}</strong> depuis quelque temps et je vois une réelle synergie possible entre nos deux organisations.</p>
  
  <p>Nous accompagnons actuellement plusieurs acteurs de votre secteur sur les problématiques de <strong> Lead Generation</strong> et les résultats sont probants.</p>
  
  <p>Seriez-vous ouvert à une discussion informelle sur la manière dont nous pourrions collaborer ?</p>
  
  <p>À votre disposition,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Invitation Networking & Cocktail",
        category: "Event",
        subject: "Invitation : Soirée Networking exclusive",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Nous organisons une soirée networking exclusive pour les décideurs de votre secteur.</p>
  
  <p>Nous serions honorés de vous compter parmi nos invités pour partager un moment convivial et échanger sur les enjeux de <strong>{{company}}</strong>.</p>
  
  <p style="text-align: center; margin: 30px 0;">
    <a href="#" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; rounded: 8px; font-weight: bold;">Confirmer ma présence</a>
  </p>
  
  <p>Au plaisir de vous y retrouver,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Relance Prospect Douce",
        category: "Sales",
        subject: "Des nouvelles de votre projet ?",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Je reviens vers vous suite à notre dernier échange concernant l'activité de <strong>{{company}}</strong>.</p>
  
  <p>Avez-vous eu le temps d'étudier notre proposition ? Je reste à votre entière disposition pour répondre à vos éventuelles questions ou adapter notre offre à vos besoins actuels.</p>
  
  <p>Dans l'attente de votre retour,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Offre Marketing Flash",
        category: "Marketing",
        subject: "Offre Spéciale : Boostez votre LeadGen chez {{company}}",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Nous lançons une offre limitée pour aider les équipes de <strong>{{company}}</strong> à optimiser leur prospection.</p>
  
  <p style="font-size: 18px; color: #4f46e5; font-weight: bold;">Bénéficiez de -20% sur notre accompagnement stratégique ce mois-ci.</p>
  
  <p>Souhaitez-vous en savoir plus sur les modalités ?</p>
  
  <p>Cordialement,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Demande de Recommandation",
        category: "Networking",
        subject: "Demande de conseil / recommandation",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Nous apprécions beaucoup notre collaboration avec <strong>{{company}}</strong>.</p>
  
  <p>Dans le cadre de notre développement, nous cherchons à entrer en contact avec des professionnels partageant vos enjeux. Auriez-vous dans votre réseau une personne à qui nos solutions de LeadGen pourraient être utiles ?</p>
  
  <p>Merci d'avance pour votre aide précieuse,</p>
  
  <p>Bien à vous,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Suivi après Appel Vocal",
        category: "Follow-up",
        subject: "Merci pour notre échange téléphonique aujourd'hui",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Merci pour le temps que vous m'avez accordé au téléphone aujourd'hui.</p>
  
  <p>J'ai bien noté vos objectifs pour <strong>{{company}}</strong>. Comme promis, je vous joins le récapitulatif de nos services qui répondent spécifiquement à vos besoins de croissance.</p>
  
  <p>Au plaisir de refaire un point prochainement,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Invitation Salon (Focus VIP)",
        category: "Event",
        subject: "Accès VIP : Salon Professionnel",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Cher(e) {{Prénom}},</p>
  
  <p>En tant que partenaire privilégié de <strong>{{company}}</strong>, nous avons le plaisir de vous offrir une <strong>accréditation VIP</strong> pour le salon professionnel à venir.</p>
  
  <p>Cet accès vous donne droit au lounge exclusif et à une session de consulting gratuite avec nos experts sur notre stand.</p>
  
  <p>Confirmez-moi simplement votre intérêt pour recevoir votre badge.</p>
  
  <p>À très bientôt,<br>L'équipe LeadGen AI Pro</p>
</div>
    `.trim()
    },
    {
        name: "Newsletter Flash / Update",
        category: "Product",
        subject: "Nouveauté LeadGen AI Pro : Optimisez votre CRM",
        body: `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p>Bonjour {{Prénom}},</p>
  
  <p>Nous venons de déployer une nouvelle fonctionnalité qui pourrait grandement simplifier la gestion de vos contacts chez <strong>{{company}}</strong>.</p>
  
  <p>Il s'agit de notre <strong>Bibliothèque de Templates</strong>, conçue pour vous faire gagner un temps précieux lors de vos campagnes de prospection.</p>
  
  <p>Découvrez-la dès maintenant dans votre interface !</p>
  
  <p>L'équipe Produit LeadGen AI Pro</p>
</div>
    `.trim()
    }
];

const TemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<EmailTemplate>>({});
    const [showPreview, setShowPreview] = useState<string | null>(null);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const stored = localStorage.getItem('leadgen_email_templates');
            if (stored) {
                setTemplates(JSON.parse(stored));
            } else {
                const initial = PREDEFINED_TEMPLATES.map((t, i) => ({
                    ...t,
                    id: `tpl-${Date.now()}-${i}`,
                    createdAt: new Date().toISOString()
                }));
                setTemplates(initial);
                localStorage.setItem('leadgen_email_templates', JSON.stringify(initial));
            }

            if (supabase) {
                const { data, error } = await supabase.from('email_templates').select('*');
                if (!error && data && data.length > 0) {
                    setTemplates(data);
                    localStorage.setItem('leadgen_email_templates', JSON.stringify(data));
                }
            }
        } catch (e) {
            console.error("Template Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleSave = async (id: string) => {
        const updated = templates.map(t => t.id === id ? { ...t, ...editData } : t);
        setTemplates(updated);
        localStorage.setItem('leadgen_email_templates', JSON.stringify(updated));

        if (supabase) {
            try {
                const templateToSave = updated.find(t => t.id === id);
                await supabase.from('email_templates').upsert(templateToSave);
            } catch (e) { console.error(e); }
        }

        setIsEditing(null);
    };

    const handleDelete = (id: string) => {
        if (confirm("Supprimer ce template ?")) {
            const filtered = templates.filter(t => t.id !== id);
            setTemplates(filtered);
            localStorage.setItem('leadgen_email_templates', JSON.stringify(filtered));
            if (supabase) {
                supabase.from('email_templates').delete().eq('id', id).then();
            }
        }
    };

    const handleCreate = () => {
        const newTpl: EmailTemplate = {
            id: `tpl-${Date.now()}`,
            name: "Nouveau Template",
            subject: "Objet...",
            body: "<p>Bonjour {{Prénom}},</p>",
            category: "Custom",
            createdAt: new Date().toISOString()
        };
        const updated = [newTpl, ...templates];
        setTemplates(updated);
        setEditData(newTpl);
        setIsEditing(newTpl.id);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm gap-8 text-center md:text-left">
                <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                        Email Library
                    </h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] italic flex items-center justify-center md:justify-start gap-2">
                        <BookOpen size={14} className="text-indigo-500" />
                        10 Stratégies Prêtes à l'Emploi
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-10 py-5 bg-slate-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-4 transition hover:bg-indigo-600 active:scale-95 italic"
                >
                    <Plus size={20} strokeWidth={3} /> Créer un Template
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {templates.map(tpl => (
                    <div key={tpl.id} className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-500">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{tpl.category || 'Standard'}</span>
                                    <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 truncate max-w-[200px]">{tpl.name}</h3>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowPreview(tpl.id)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Eye size={18} /></button>
                                <button onClick={() => { setIsEditing(tpl.id); setEditData(tpl); }} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                                <button onClick={() => handleDelete(tpl.id)} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                            </div>
                        </div>

                        <div className="p-10 flex-1 space-y-6">
                            {isEditing === tpl.id ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nom du Template</label>
                                        <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-500 font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Objet de l'Email</label>
                                        <div className="relative">
                                            <Target size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                            <input value={editData.subject} onChange={e => setEditData({ ...editData, subject: e.target.value })} className="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-500 font-bold" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Corps (HTML autorisé)</label>
                                        <textarea rows={8} value={editData.body} onChange={e => setEditData({ ...editData, body: e.target.value })} className="w-full p-6 bg-slate-50 rounded-3xl outline-none border-2 border-transparent focus:border-indigo-500 font-medium text-sm italic" />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => handleSave(tpl.id)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all"><Save size={16} /> Sauvegarder</button>
                                        <button onClick={() => setIsEditing(null)} className="px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]">Annuler</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Objet :</p>
                                        <p className="text-sm font-bold text-slate-700 italic">{tpl.subject}</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 min-h-[150px] relative overflow-hidden group/text">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Aperçu :</p>
                                        <div className="text-[11px] text-slate-500 font-medium line-clamp-4 leading-relaxed italic" dangerouslySetInnerHTML={{ __html: tpl.body.substring(0, 300) + '...' }} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent group-hover/text:opacity-0 transition-opacity" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL PREVIEW */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl z-[300] flex items-center justify-center p-4" onClick={() => setShowPreview(null)}>
                    <div className="bg-white w-full max-w-3xl rounded-[60px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-8 border-white animate-in zoom-in" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <Eye size={24} />
                                </div>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Aperçu du Template</h3>
                            </div>
                            <button onClick={() => setShowPreview(null)} className="p-3 bg-white text-slate-400 hover:text-rose-500 rounded-xl border border-slate-100 transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-12 overflow-y-auto custom-scrollbar bg-white">
                            <div className="mb-10 p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Sujet de l'email :</p>
                                <p className="text-xl font-black italic text-slate-900 truncate">{templates.find(t => t.id === showPreview)?.subject}</p>
                            </div>
                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[48px] bg-slate-50/20">
                                <div
                                    className="email-content text-slate-700 italic leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: templates.find(t => t.id === showPreview)?.body || "" }}
                                />
                            </div>
                            <div className="mt-10 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-center gap-4">
                                <Sparkles className="text-indigo-500 shrink-0" size={20} />
                                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Ce template sera formaté en HTML propre lors de l'envoi via EmailJS.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateManager;
