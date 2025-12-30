import React, { useState } from 'react';
import { Contact } from '../types';
import { User, Trash2, Edit2, Database, Wand2 } from 'lucide-react';

interface ContactListProps {
    contacts: Contact[];
    themeColor: string;
    onEdit: (contact: Contact) => void;
    onDelete: (id: string) => void;
    onScore?: (contact: Contact) => void;
}

const ContactList: React.FC<ContactListProps> = ({ contacts, themeColor, onEdit, onDelete, onScore }) => {
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const getScoreColor = (score?: number) => {
        if (score === undefined) return '';
        if (score >= 80) return 'bg-emerald-500 text-white shadow-emerald-500/30';
        if (score >= 50) return 'bg-amber-500 text-white';
        return 'bg-rose-500 text-white';
    };

    if (contacts.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-40 opacity-10 animate-pulse text-center space-y-8">
                <Database size={100} className="text-slate-900" />
                <p className="text-4xl font-black uppercase tracking-[0.8em] italic text-slate-900">BASE VIDE</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contacts.map(c => (
                <div key={c.id} className="bg-white/80 backdrop-blur-md rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col overflow-hidden relative group">
                    {pendingDeleteId === c.id && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl z-[50] flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-300">
                            <Trash2 size={40} className="text-white mb-6 animate-bounce" />
                            <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8 italic">Supprimer ?</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => { onDelete(c.id); setPendingDeleteId(null); }} className="flex-1 py-4 bg-white text-rose-600 rounded-[20px] text-[11px] font-black uppercase shadow-xl italic">Oui</button>
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
                            {c.score !== undefined && (
                                <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm ml-2 ${getScoreColor(c.score)}`}>
                                    {c.score}/100
                                </span>
                            )}
                        </div>
                        <div className="space-y-1 mb-6">
                            <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 truncate leading-none">{c.company || 'Enterprise'}</h4>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest italic truncate">{c.firstName} {c.lastName}</p>
                            {c.title && <p className="text-[9px] font-black text-indigo-500/60 uppercase italic truncate">{c.title}</p>}
                        </div>
                    </div>
                    <div className="p-6 flex gap-3 bg-slate-50/30 border-t border-slate-100">
                        {onScore && (
                            <button onClick={() => onScore(c)} className="p-4 bg-white text-slate-400 hover:text-violet-600 border border-slate-200 rounded-[20px] transition-all hover:scale-110 active:scale-95 shadow-sm" title="Scorer IA"><Wand2 size={16} /></button>
                        )}
                        <button onClick={() => onEdit(c)} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-slate-900 hover:text-indigo-600 border border-slate-200 rounded-[20px] text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-sm italic active:scale-95"><Edit2 size={14} /> Profil</button>
                        <button onClick={() => setPendingDeleteId(c.id)} className="p-4 bg-white text-slate-300 hover:text-rose-500 border border-slate-200 rounded-[20px] transition-all active:scale-90"><Trash2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ContactList;
