
import React, { useState, useEffect } from 'react';
import {
    Users, Trash2, GitMerge, AlertCircle, Check, X, RefreshCw, Search, Filter
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Contact } from '../types';

const DuplicateManager: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [duplicateGroups, setDuplicateGroups] = useState<{ email: string; contacts: Contact[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'member' | 'prospect'>('all');

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.from('contacts').select('*');
            if (error) throw error;

            const contactList = (data || []).map((item: any) => ({
                ...item,
                id: String(item.id),
            }));

            setContacts(contactList);
            findDuplicates(contactList);
        } catch (err) {
            console.error('Error loading contacts:', err);
        } finally {
            setLoading(false);
        }
    };

    const findDuplicates = (contactList: Contact[]) => {
        const emailMap = new Map<string, Contact[]>();

        contactList.forEach(contact => {
            if (contact.email && contact.email.trim() !== '') {
                const email = contact.email.toLowerCase().trim();
                if (!emailMap.has(email)) {
                    emailMap.set(email, []);
                }
                emailMap.get(email)!.push(contact);
            }
        });

        const duplicates = Array.from(emailMap.entries())
            .filter(([_, contacts]) => contacts.length > 1)
            .map(([email, contacts]) => ({ email, contacts }))
            .sort((a, b) => b.contacts.length - a.contacts.length);

        setDuplicateGroups(duplicates);
    };

    const handleMergeContacts = async () => {
        if (selectedForMerge.length < 2 || !supabase) return;

        setProcessing(true);
        try {
            const contactsToMerge = contacts.filter(c => selectedForMerge.includes(c.id));

            if (contactsToMerge.length < 2) {
                alert('Veuillez sélectionner au moins 2 contacts à fusionner');
                setProcessing(false);
                return;
            }

            console.log('Contacts to merge:', contactsToMerge);

            // Merge logic: keep the first selected, merge data from others
            const primary = contactsToMerge[0];
            const others = contactsToMerge.slice(1);

            console.log('Primary contact:', primary);
            console.log('Other contacts:', others);

            // Only include updateable fields - using snake_case for Supabase
            const mergedData = {
                first_name: primary.firstName || others.find(c => c.firstName)?.firstName || '',
                last_name: primary.lastName || others.find(c => c.lastName)?.lastName || '',
                email: primary.email,
                company: primary.company || others.find(c => c.company)?.company || '',
                phone: primary.phone || others.find(c => c.phone)?.phone || '',
                category: primary.category,
                status: primary.status || others.find(c => c.status)?.status || 'New',
                notes: [primary.notes, ...others.map(c => c.notes)].filter(Boolean).join('\n---\n'),
            };

            console.log('Merged data to update:', mergedData);

            // Convert primary.id to the correct format
            const primaryId = /^\d+$/.test(String(primary.id)) ? parseInt(String(primary.id), 10) : String(primary.id);

            console.log('Updating primary contact with ID:', primaryId);

            // Update primary contact
            const { data: updateData, error: updateError } = await supabase
                .from('contacts')
                .update(mergedData)
                .eq('id', primaryId)
                .select();

            if (updateError) {
                console.error('Update error:', updateError);
                throw new Error(`Erreur de mise à jour: ${updateError.message || JSON.stringify(updateError)}`);
            }

            console.log('Update successful:', updateData);

            // Delete other contacts
            const idsToDelete = others.map(c => {
                const id = String(c.id);
                return /^\d+$/.test(id) ? parseInt(id, 10) : id;
            });

            console.log('IDs to delete:', idsToDelete);

            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('contacts')
                    .delete()
                    .in('id', idsToDelete);

                if (deleteError) {
                    console.error('Delete error:', deleteError);
                    throw new Error(`Erreur de suppression: ${deleteError.message || JSON.stringify(deleteError)}`);
                }

                console.log('Delete successful');
            }

            // Reload
            await loadContacts();
            setSelectedForMerge([]);
            setSelectedGroup(null);

            alert('Fusion réussie !');
        } catch (err: any) {
            console.error('Error merging contacts:', err);
            const errorMessage = err?.message || err?.error_description || err?.hint || JSON.stringify(err);
            alert(`Erreur lors de la fusion des contacts:\n${errorMessage}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteContacts = async () => {
        if (selectedForMerge.length === 0 || !supabase) return;

        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedForMerge.length} contact(s) ?`)) return;

        setProcessing(true);
        try {
            const { error } = await supabase
                .from('contacts')
                .delete()
                .in('id', selectedForMerge);

            if (error) throw error;

            await loadContacts();
            setSelectedForMerge([]);
            setSelectedGroup(null);
        } catch (err) {
            console.error('Error deleting contacts:', err);
            alert('Erreur lors de la suppression des contacts');
        } finally {
            setProcessing(false);
        }
    };

    const filteredGroups = duplicateGroups.filter(group => {
        const matchesSearch = searchTerm === '' ||
            group.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.contacts.some(c =>
                c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.company?.toLowerCase().includes(searchTerm.toLowerCase())
            );

        const matchesCategory = filterCategory === 'all' ||
            group.contacts.some(c => c.category === filterCategory);

        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 rounded-[48px] p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-6 mb-6">
                    <div className="p-4 bg-amber-500/10 text-amber-600 rounded-2xl">
                        <Users size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900">
                            Gestion des Doublons
                        </h1>
                        <p className="text-slate-400 text-sm font-bold mt-1">
                            {duplicateGroups.length} groupe(s) de doublons détecté(s)
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Rechercher par email, nom ou société..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[24px] outline-none font-bold text-sm focus:border-amber-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'member', 'prospect'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat as any)}
                                className={`px-6 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all ${filterCategory === cat
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white text-slate-400 hover:bg-slate-100'
                                    }`}
                            >
                                {cat === 'all' ? 'Tous' : cat === 'member' ? 'Membres' : 'Prospects'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Duplicate Groups */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                {filteredGroups.length === 0 ? (
                    <div className="text-center py-20">
                        <AlertCircle size={64} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-400 font-bold text-lg">
                            {duplicateGroups.length === 0
                                ? 'Aucun doublon détecté ! 🎉'
                                : 'Aucun résultat pour ces filtres'}
                        </p>
                    </div>
                ) : (
                    filteredGroups.map((group) => (
                        <div
                            key={group.email}
                            className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm"
                        >
                            {/* Group Header */}
                            <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg">
                                        {group.contacts.length}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-slate-900">{group.email}</p>
                                        <p className="text-xs text-slate-500 font-bold">
                                            {group.contacts.length} contact(s) avec cet email
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedGroup(selectedGroup === group.email ? null : group.email)}
                                    className="px-4 py-2 bg-white rounded-xl text-xs font-black uppercase tracking-widest text-amber-600 hover:bg-amber-100 transition-all"
                                >
                                    {selectedGroup === group.email ? 'Fermer' : 'Gérer'}
                                </button>
                            </div>

                            {/* Contacts in Group */}
                            {selectedGroup === group.email && (
                                <div className="p-6 space-y-4">
                                    {group.contacts.map((contact) => {
                                        const isSelected = selectedForMerge.includes(contact.id);
                                        return (
                                            <div
                                                key={contact.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedForMerge(prev => prev.filter(id => id !== contact.id));
                                                    } else {
                                                        setSelectedForMerge(prev => [...prev, contact.id]);
                                                    }
                                                }}
                                                className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-500'
                                                    : contact.category === 'member'
                                                        ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
                                                        : 'bg-indigo-50/30 border-indigo-200 hover:border-indigo-400'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                                                            }`}>
                                                            {isSelected ? <Check size={18} /> : <Users size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-slate-900">
                                                                {contact.firstName} {contact.lastName}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-bold">
                                                                {contact.company || 'Sans société'} • {contact.category === 'member' ? 'Membre' : 'Prospect'}
                                                            </p>
                                                            {contact.phone && (
                                                                <p className="text-xs text-slate-400 mt-1">{contact.phone}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${contact.category === 'member'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                        }`}>
                                                        {contact.category === 'member' ? 'MEMBRE' : 'PROSPECT'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Actions */}
                                    {selectedForMerge.length > 0 && (
                                        <div className="flex gap-4 pt-4 border-t border-slate-200">
                                            <button
                                                onClick={handleMergeContacts}
                                                disabled={processing || selectedForMerge.length < 2}
                                                className="flex-1 py-4 bg-indigo-600 text-white rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {processing ? <RefreshCw className="animate-spin" size={18} /> : <GitMerge size={18} />}
                                                Fusionner ({selectedForMerge.length})
                                            </button>
                                            <button
                                                onClick={handleDeleteContacts}
                                                disabled={processing}
                                                className="flex-1 py-4 bg-rose-600 text-white rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {processing ? <RefreshCw className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                                Supprimer ({selectedForMerge.length})
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DuplicateManager;
