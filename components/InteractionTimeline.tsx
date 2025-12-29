import React, { useState, useEffect } from 'react';
import {
    Phone, Mail, Calendar, FileText, TrendingUp, Clock, Plus, X, Check,
    MessageSquare, UserCheck, DollarSign, Edit2, Trash2, RefreshCw
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface Interaction {
    id: string;
    contact_id: string;
    type: 'email' | 'call' | 'meeting' | 'note' | 'status_change' | 'deal_update';
    content: string;
    metadata?: any;
    created_at: string;
    created_by: string;
}

interface InteractionTimelineProps {
    contactId: string;
    contactName: string;
}

const INTERACTION_TYPES = [
    { id: 'email', label: 'Email', icon: Mail, color: 'blue' },
    { id: 'call', label: 'Appel', icon: Phone, color: 'emerald' },
    { id: 'meeting', label: 'Réunion', icon: Calendar, color: 'violet' },
    { id: 'note', label: 'Note', icon: FileText, color: 'amber' },
    { id: 'status_change', label: 'Changement de statut', icon: UserCheck, color: 'indigo' },
    { id: 'deal_update', label: 'Mise à jour deal', icon: DollarSign, color: 'rose' },
];

const InteractionTimeline: React.FC<InteractionTimelineProps> = ({ contactId, contactName }) => {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newInteraction, setNewInteraction] = useState({
        type: 'note' as Interaction['type'],
        content: '',
    });

    useEffect(() => {
        loadInteractions();
    }, [contactId]);

    const loadInteractions = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                setLoading(false);
                return;
            }

            const contactIdNum = /^\d+$/.test(contactId) ? parseInt(contactId, 10) : contactId;

            const { data, error } = await supabase
                .from('interactions')
                .select('*')
                .eq('contact_id', contactIdNum)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const interactionList = (data || []).map((item: any) => ({
                ...item,
                id: String(item.id),
                contact_id: String(item.contact_id),
            }));

            setInteractions(interactionList);
        } catch (err) {
            console.error('Error loading interactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddInteraction = async () => {
        if (!supabase || !newInteraction.content.trim()) {
            alert('Veuillez saisir un contenu');
            return;
        }

        try {
            const contactIdNum = /^\d+$/.test(contactId) ? parseInt(contactId, 10) : contactId;

            const { error } = await supabase
                .from('interactions')
                .insert([{
                    contact_id: contactIdNum,
                    type: newInteraction.type,
                    content: newInteraction.content,
                }]);

            if (error) throw error;

            await loadInteractions();
            setShowAddModal(false);
            setNewInteraction({ type: 'note', content: '' });
        } catch (err: any) {
            console.error('Error adding interaction:', err);
            alert(`Erreur: ${err.message}`);
        }
    };

    const handleDeleteInteraction = async (interactionId: string) => {
        if (!confirm('Supprimer cette interaction ?')) return;
        if (!supabase) return;

        try {
            const id = /^\d+$/.test(interactionId) ? parseInt(interactionId, 10) : interactionId;

            const { error } = await supabase
                .from('interactions')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await loadInteractions();
        } catch (err: any) {
            console.error('Error deleting interaction:', err);
            alert(`Erreur: ${err.message}`);
        }
    };

    const getTypeConfig = (type: string) => {
        return INTERACTION_TYPES.find(t => t.id === type) || INTERACTION_TYPES[3];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;

        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-black uppercase italic text-slate-900">Historique</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                        {interactions.length} interaction(s) avec {contactName}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                >
                    <Plus size={16} />
                    Ajouter
                </button>
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-transparent"></div>

                <div className="space-y-6">
                    {interactions.length === 0 ? (
                        <div className="text-center py-12">
                            <MessageSquare size={48} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-slate-400 font-bold">Aucune interaction enregistrée</p>
                            <p className="text-xs text-slate-400 mt-1">Ajoutez votre première note, appel ou email</p>
                        </div>
                    ) : (
                        interactions.map((interaction, index) => {
                            const typeConfig = getTypeConfig(interaction.type);
                            const Icon = typeConfig.icon;

                            return (
                                <div key={interaction.id} className="relative pl-16">
                                    {/* Icon */}
                                    <div className={`absolute left-0 w-12 h-12 rounded-xl bg-${typeConfig.color}-100 text-${typeConfig.color}-600 flex items-center justify-center shadow-sm`}>
                                        <Icon size={20} />
                                    </div>

                                    {/* Content Card */}
                                    <div className="bg-white rounded-[20px] border border-slate-200 p-5 hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                                                        {typeConfig.label}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
                                                        <Clock size={12} />
                                                        {formatDate(interaction.created_at)}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                    {interaction.content}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteInteraction(interaction.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {interaction.created_by && interaction.created_by !== 'system' && (
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                                Par {interaction.created_by}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Add Interaction Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[32px] p-8 max-w-xl w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black uppercase italic text-slate-900">
                                Nouvelle Interaction
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {INTERACTION_TYPES.filter(t => !['status_change', 'deal_update'].includes(t.id)).map((type) => {
                                        const Icon = type.icon;
                                        const isSelected = newInteraction.type === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                onClick={() => setNewInteraction({ ...newInteraction, type: type.id as any })}
                                                className={`p-4 rounded-[16px] border-2 transition-all flex flex-col items-center gap-2 ${isSelected
                                                        ? `bg-${type.color}-50 border-${type.color}-500`
                                                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <Icon size={20} className={isSelected ? `text-${type.color}-600` : 'text-slate-400'} />
                                                <span className={`text-xs font-black ${isSelected ? `text-${type.color}-700` : 'text-slate-600'}`}>
                                                    {type.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Contenu</label>
                                <textarea
                                    value={newInteraction.content}
                                    onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
                                    placeholder="Décrivez l'interaction..."
                                    rows={5}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[16px] outline-none font-medium text-sm resize-none focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <button
                                onClick={handleAddInteraction}
                                className="w-full py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-sm tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InteractionTimeline;
