
import React, { useState, useEffect } from 'react';
import {
    TrendingUp, DollarSign, Users, Target, Filter, Search, Plus, X, Check,
    ChevronRight, Calendar, Phone, Mail, Edit2, Trash2, RefreshCw, Eye,
    ArrowRight, Award, AlertCircle, TrendingDown, Maximize2, Minimize2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Contact } from '../types';

interface Deal {
    id: string;
    contact_id: string;
    title: string;
    value: number;
    stage: 'new' | 'contacted' | 'interested' | 'negotiation' | 'won' | 'lost';
    probability: number;
    expected_close_date: string;
    created_at: string;
    contact?: Contact;
}

const STAGES = [
    { id: 'new', label: 'Nouveau', color: 'slate', icon: <AlertCircle size={18} /> },
    { id: 'contacted', label: 'Contacté', color: 'blue', icon: <Phone size={18} /> },
    { id: 'interested', label: 'Intéressé', color: 'indigo', icon: <Eye size={18} /> },
    { id: 'negotiation', label: 'Négociation', color: 'violet', icon: <TrendingUp size={18} /> },
    { id: 'won', label: 'Gagné', color: 'emerald', icon: <Award size={18} /> },
    { id: 'lost', label: 'Perdu', color: 'rose', icon: <TrendingDown size={18} /> },
];

const PipelineManager: React.FC = () => {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'member' | 'prospect'>('all');
    const [isCompactView, setIsCompactView] = useState(false);
    const [showNewDealModal, setShowNewDealModal] = useState(false);
    const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

    const [newDeal, setNewDeal] = useState({
        contact_id: '',
        title: '',
        value: 0,
        stage: 'new' as Deal['stage'],
        probability: 10,
        expected_close_date: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                setLoading(false);
                return;
            }

            // Load contacts
            const { data: contactsData, error: contactsError } = await supabase
                .from('contacts')
                .select('*');

            if (contactsError) throw contactsError;

            const contactList = (contactsData || []).map((item: any) => ({
                ...item,
                id: String(item.id),
                firstName: item.first_name || item.firstName || '',
                lastName: item.last_name || item.lastName || '',
                company: item.company || '',
                email: item.email || '',
                phone: item.phone || '',
                category: item.category || 'prospect',
            }));

            setContacts(contactList);

            // Load deals
            const { data: dealsData, error: dealsError } = await supabase
                .from('deals')
                .select('*')
                .order('created_at', { ascending: false });

            if (dealsError) throw dealsError;

            const dealList = (dealsData || []).map((item: any) => ({
                ...item,
                id: String(item.id),
                contact_id: String(item.contact_id),
                contact: contactList.find((c: Contact) => c.id === String(item.contact_id)),
            }));

            setDeals(dealList);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDeal = async () => {
        if (!supabase || !newDeal.contact_id || !newDeal.title) {
            alert('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('deals')
                .insert([{
                    contact_id: newDeal.contact_id,
                    title: newDeal.title,
                    value: newDeal.value,
                    stage: newDeal.stage,
                    probability: newDeal.probability,
                    expected_close_date: newDeal.expected_close_date || null,
                }])
                .select();

            if (error) throw error;

            await loadData();
            setShowNewDealModal(false);
            setNewDeal({
                contact_id: '',
                title: '',
                value: 0,
                stage: 'new',
                probability: 10,
                expected_close_date: '',
            });
        } catch (err: any) {
            console.error('Error creating deal:', err);
            alert(`Erreur: ${err.message}`);
        }
    };

    const handleDragStart = (deal: Deal) => {
        setDraggedDeal(deal);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (stage: Deal['stage']) => {
        if (!draggedDeal || !supabase) return;

        try {
            const { error } = await supabase
                .from('deals')
                .update({ stage })
                .eq('id', draggedDeal.id);

            if (error) throw error;

            await loadData();
            setDraggedDeal(null);
        } catch (err: any) {
            console.error('Error updating deal:', err);
            alert(`Erreur: ${err.message}`);
        }
    };

    const handleDeleteDeal = async (dealId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette opportunité ?')) return;
        if (!supabase) return;

        try {
            console.log('Deleting deal with ID:', dealId);

            const { error } = await supabase
                .from('deals')
                .delete()
                .eq('id', dealId);

            if (error) {
                console.error('Delete error:', error);
                throw error;
            }

            console.log('Deal deleted successfully');
            await loadData();
            setSelectedDeal(null);
        } catch (err: any) {
            console.error('Error deleting deal:', err);
            alert(`Erreur lors de la suppression: ${err.message || JSON.stringify(err)}`);
        }
    };

    const filteredDeals = deals.filter(deal => {
        const matchesSearch = searchTerm === '' ||
            deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            deal.contact?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            deal.contact?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            deal.contact?.company?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = filterCategory === 'all' ||
            deal.contact?.category === filterCategory;

        return matchesSearch && matchesCategory;
    });

    const getDealsByStage = (stage: string) => {
        return filteredDeals.filter(d => d.stage === stage);
    };

    const getTotalValueByStage = (stage: string) => {
        return getDealsByStage(stage).reduce((sum, deal) => sum + (deal.value || 0), 0);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="animate-spin text-violet-500" size={48} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-violet-50 to-purple-50 rounded-[48px] p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-500/10 text-violet-600 rounded-xl">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">
                                Pipeline Commercial
                            </h1>
                            <p className="text-slate-400 text-xs font-bold mt-0.5">
                                {deals.length} opportunité(s) • {formatCurrency(deals.reduce((sum, d) => sum + d.value, 0))} total
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCompactView(!isCompactView)}
                            className="p-3 bg-white rounded-[16px] text-slate-600 hover:bg-violet-50 transition-all shadow-sm"
                            title={isCompactView ? "Vue étendue" : "Vue compacte"}
                        >
                            {isCompactView ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                        </button>
                        <button
                            onClick={() => setShowNewDealModal(true)}
                            className="px-5 py-3 bg-violet-600 text-white rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Nouvelle Opportunité
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher une opportunité..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-[20px] outline-none font-bold text-sm focus:border-violet-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'member', 'prospect'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat as any)}
                                className={`px-5 py-3 rounded-[16px] font-black text-[10px] uppercase tracking-widest transition-all ${filterCategory === cat
                                    ? 'bg-violet-500 text-white shadow-lg'
                                    : 'bg-white text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                {cat === 'all' ? 'Tous' : cat === 'member' ? 'Membres' : 'Prospects'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex gap-6 h-full pb-4 min-w-max">
                    {STAGES.map((stage) => {
                        const stageDeals = getDealsByStage(stage.id);
                        const totalValue = getTotalValueByStage(stage.id);

                        return (
                            <div
                                key={stage.id}
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(stage.id as Deal['stage'])}
                                className="flex-shrink-0 w-80 flex flex-col bg-white rounded-[32px] border border-slate-200 shadow-sm"
                            >
                                {/* Column Header */}
                                <div className={`p-6 border-b border-${stage.color}-100 bg-${stage.color}-50/50`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 bg-${stage.color}-100 text-${stage.color}-600 rounded-xl`}>
                                                {stage.icon}
                                            </div>
                                            <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">
                                                {stage.label}
                                            </h3>
                                        </div>
                                        <div className={`px-3 py-1 bg-${stage.color}-100 text-${stage.color}-700 rounded-full text-xs font-black`}>
                                            {stageDeals.length}
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">
                                        {formatCurrency(totalValue)}
                                    </p>
                                </div>

                                {/* Cards */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {stageDeals.map((deal) => (
                                        <div
                                            key={deal.id}
                                            draggable
                                            onDragStart={() => handleDragStart(deal)}
                                            onClick={() => setSelectedDeal(deal)}
                                            className={`p-5 rounded-[20px] border-2 cursor-move hover:shadow-lg transition-all ${deal.contact?.category === 'member'
                                                ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                                                : 'bg-indigo-50 border-indigo-200 hover:border-indigo-400'
                                                } ${isCompactView ? 'py-3' : ''}`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h4 className="font-black text-sm text-slate-900 leading-tight flex-1">
                                                    {deal.title}
                                                </h4>
                                                <div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${deal.contact?.category === 'member'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    {deal.contact?.category === 'member' ? 'M' : 'P'}
                                                </div>
                                            </div>

                                            {!isCompactView && (
                                                <>
                                                    <p className="text-xs text-slate-600 font-bold mb-3">
                                                        {deal.contact?.firstName} {deal.contact?.lastName}
                                                        {deal.contact?.company && ` • ${deal.contact.company}`}
                                                    </p>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-violet-600">
                                                            <DollarSign size={16} />
                                                            <span className="font-black text-sm">
                                                                {formatCurrency(deal.value)}
                                                            </span>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${deal.probability >= 75 ? 'bg-emerald-100 text-emerald-700' :
                                                            deal.probability >= 50 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {deal.probability}%
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {stageDeals.length === 0 && (
                                        <div className="text-center py-12 text-slate-300">
                                            <Target size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-xs font-bold">Aucune opportunité</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* New Deal Modal */}
            {showNewDealModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">
                                Nouvelle Opportunité
                            </h2>
                            <button
                                onClick={() => setShowNewDealModal(false)}
                                className="p-3 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Contact</label>
                                <select
                                    value={newDeal.contact_id}
                                    onChange={(e) => setNewDeal({ ...newDeal, contact_id: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none font-bold text-sm"
                                >
                                    <option value="">Sélectionner un contact</option>
                                    {contacts.map((contact) => {
                                        const badge = contact.category === 'member' ? '🟢' : '🔵';
                                        const categoryLabel = contact.category === 'member' ? 'MEMBRE' : 'PROSPECT';
                                        return (
                                            <option key={contact.id} value={contact.id}>
                                                {badge} {contact.firstName} {contact.lastName} • {contact.company || 'Sans société'} [{categoryLabel}]
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-[10px] text-slate-400 font-bold mt-2 ml-2">
                                    🟢 = Membre • 🔵 = Prospect
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Titre de l'opportunité</label>
                                <input
                                    type="text"
                                    value={newDeal.title}
                                    onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                                    placeholder="Ex: Contrat annuel maintenance"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none font-bold text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Valeur (€)</label>
                                    <input
                                        type="number"
                                        value={newDeal.value}
                                        onChange={(e) => setNewDeal({ ...newDeal, value: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none font-bold text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Probabilité (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newDeal.probability}
                                        onChange={(e) => setNewDeal({ ...newDeal, probability: parseInt(e.target.value) || 0 })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Date de clôture estimée</label>
                                <input
                                    type="date"
                                    value={newDeal.expected_close_date}
                                    onChange={(e) => setNewDeal({ ...newDeal, expected_close_date: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[20px] outline-none font-bold text-sm"
                                />
                            </div>

                            <button
                                onClick={handleCreateDeal}
                                className="w-full py-5 bg-violet-600 text-white rounded-[24px] font-black uppercase text-sm tracking-widest hover:bg-violet-700 transition-all shadow-lg"
                            >
                                Créer l'opportunité
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deal Detail Modal */}
            {selectedDeal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900">
                                {selectedDeal.title}
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDeleteDeal(selectedDeal.id)}
                                    className="p-3 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                                >
                                    <Trash2 size={20} />
                                </button>
                                <button
                                    onClick={() => setSelectedDeal(null)}
                                    className="p-3 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-violet-50 rounded-[24px]">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs font-black uppercase text-violet-600 mb-2">Valeur</p>
                                        <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedDeal.value)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-violet-600 mb-2">Probabilité</p>
                                        <p className="text-2xl font-black text-slate-900">{selectedDeal.probability}%</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-black uppercase text-slate-500 mb-3">Contact</p>
                                <div className="p-5 bg-slate-50 rounded-[20px]">
                                    <p className="font-black text-slate-900">
                                        {selectedDeal.contact?.firstName} {selectedDeal.contact?.lastName}
                                    </p>
                                    {selectedDeal.contact?.company && (
                                        <p className="text-sm text-slate-600 font-bold mt-1">{selectedDeal.contact.company}</p>
                                    )}
                                    {selectedDeal.contact?.email && (
                                        <p className="text-sm text-slate-500 mt-2">{selectedDeal.contact.email}</p>
                                    )}
                                </div>
                            </div>

                            {selectedDeal.expected_close_date && (
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Date de clôture estimée</p>
                                    <p className="font-bold text-slate-700">
                                        {new Date(selectedDeal.expected_close_date).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipelineManager;
