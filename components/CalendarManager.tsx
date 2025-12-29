import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
    Clock, MapPin, AlignLeft, User, RefreshCw, X, Check, Trash2, Edit2,
    Search, ChevronDown
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface Event {
    id: string;
    contact_id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    reminder_minutes: number;
    is_completed: boolean;
    contact?: {
        first_name: string;
        last_name: string;
        company: string;
    };
}

const CalendarManager: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        contact_id: '',
        start_date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        reminder_minutes: 15
    });
    const [contactSearch, setContactSearch] = useState('');
    const [showContactPicker, setShowContactPicker] = useState(false);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            const search = contactSearch.toLowerCase();
            return (
                (c.first_name || '').toLowerCase().includes(search) ||
                (c.last_name || '').toLowerCase().includes(search) ||
                (c.company || '').toLowerCase().includes(search)
            );
        });
    }, [contacts, contactSearch]);

    // Noms des mois et jours en français
    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    useEffect(() => {
        fetchEvents();
        fetchContacts();
    }, [currentDate]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const { data, error } = await supabase
                .from('events')
                .select(`
          *,
          contact:contacts(first_name, last_name, company)
        `)
                .gte('start_time', startOfMonth.toISOString())
                .lte('start_time', endOfMonth.toISOString());

            if (error) throw error;
            setEvents(data || []);
        } catch (err) {
            console.error('Error fetching events:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchContacts = async () => {
        try {
            const { data } = await supabase.from('contacts').select('id, first_name, last_name, company');
            setContacts(data || []);
        } catch (err) {
            console.error('Error fetching contacts:', err);
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const startStr = `${eventForm.start_date}T${eventForm.start_time}:00`;
            const endStr = `${eventForm.start_date}T${eventForm.end_time}:00`;

            const payload = {
                title: eventForm.title,
                description: eventForm.description,
                contact_id: eventForm.contact_id || null,
                start_time: new Date(startStr).toISOString(),
                end_time: new Date(endStr).toISOString(),
                reminder_minutes: eventForm.reminder_minutes,
                is_completed: false
            };

            if (selectedEvent && !showEventModal) {
                // This is an update from the detail modal edit button
                // (I'll need to open the form for editing)
                return;
            }

            const { error } = selectedEvent?.id
                ? await supabase.from('events').update(payload).eq('id', selectedEvent.id)
                : await supabase.from('events').insert([payload]);

            if (error) throw error;

            setShowEventModal(false);
            setSelectedEvent(null);
            setEventForm({
                title: '',
                description: '',
                contact_id: '',
                start_date: new Date().toISOString().split('T')[0],
                start_time: '10:00',
                end_time: '11:00',
                reminder_minutes: 15
            });
            fetchEvents();
        } catch (err: any) {
            alert(`Erreur: ${err.message}`);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cet événement ?')) return;
        try {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
            setSelectedEvent(null);
            fetchEvents();
        } catch (err: any) {
            alert(`Erreur: ${err.message}`);
        }
    };

    // Logique de génération du calendrier
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Ajuster pour que Lundi soit 0
    };

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const days = [];
    // Jours du mois précédent pour remplir la grille
    for (let i = 0; i < firstDay; i++) {
        days.push({ day: null, currentMonth: false });
    }
    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ day: i, currentMonth: true });
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex-1 flex flex-col p-4 bg-slate-50/30 overflow-hidden relative">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 rounded-[24px] shadow-lg shadow-indigo-200">
                        <CalendarIcon size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                            Gestion du <span className="text-indigo-600">Temps</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Phase 2: Calendrier & Rappels</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-[28px] shadow-sm border border-slate-100">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-indigo-600">
                        <ChevronLeft size={20} strokeWidth={3} />
                    </button>
                    <div className="min-w-[140px] text-center">
                        <span className="text-sm font-black italic uppercase tracking-widest text-slate-600">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-indigo-600">
                        <ChevronRight size={20} strokeWidth={3} />
                    </button>
                </div>

                <button
                    onClick={() => {
                        setShowEventModal(true);
                        setShowContactPicker(false);
                        setContactSearch('');
                    }}
                    className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2 italic"
                >
                    <Plus size={18} strokeWidth={4} /> Nouveau RDV
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-white rounded-[32px] shadow-xl shadow-indigo-50/50 border border-white p-4 lg:p-6 flex flex-col overflow-hidden">
                <div className="grid grid-cols-7 mb-2">
                    {dayNames.map(day => (
                        <div key={day} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest py-2">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1 lg:gap-2">
                    {days.map((d, i) => {
                        const dateStr = d.day ? `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}` : null;
                        const dayEvents = events.filter(e => e.start_time.startsWith(dateStr || 'none'));

                        return (
                            <div
                                key={i}
                                className={`min-h-[70px] rounded-[20px] p-2 transition-all flex flex-col gap-1 ${d.currentMonth
                                    ? 'bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-indigo-50 border border-transparent hover:border-indigo-100'
                                    : 'opacity-0 pointer-events-none'
                                    }`}
                            >
                                {d.day && (
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-black ${d.day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()
                                            ? 'text-indigo-600'
                                            : 'text-slate-400'
                                            }`}>
                                            {d.day}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => setSelectedEvent(event)}
                                            className="p-2 bg-white rounded-xl border border-indigo-50 shadow-sm cursor-pointer hover:border-indigo-200 transition-all group"
                                        >
                                            <p className="text-[10px] font-bold text-slate-700 truncate group-hover:text-indigo-600">
                                                {event.title}
                                            </p>
                                            <div className="flex items-center gap-1 mt-1 opacity-50">
                                                <Clock size={8} />
                                                <span className="text-[8px] font-bold">{formatTime(event.start_time)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-[48px]">
                    <RefreshCw className="animate-spin text-indigo-600" size={48} strokeWidth={3} />
                </div>
            )}

            {/* Modal Création/Édition Événement */}
            {showEventModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic tracking-tight">
                                {selectedEvent?.id ? 'Modifier le RDV' : 'Nouveau Rendez-vous'}
                            </h3>
                            <button
                                onClick={() => { setShowEventModal(false); setSelectedEvent(null); }}
                                className="p-2 hover:bg-white/20 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Titre du rendez-vous</label>
                                <input
                                    required
                                    type="text"
                                    value={eventForm.title}
                                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                    placeholder="Ex: Démo produit, Déjeuner..."
                                    className="w-full px-6 py-4 bg-slate-50 rounded-[20px] outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={eventForm.start_date}
                                        onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 rounded-[20px] outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Rappel (Min)</label>
                                    <select
                                        value={eventForm.reminder_minutes}
                                        onChange={(e) => setEventForm({ ...eventForm, reminder_minutes: parseInt(e.target.value) })}
                                        className="w-full px-6 py-4 bg-slate-50 rounded-[20px] outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all"
                                    >
                                        <option value={0}>Aucun</option>
                                        <option value={15}>15 min avant</option>
                                        <option value={30}>30 min avant</option>
                                        <option value={60}>1 heure avant</option>
                                        <option value={1440}>1 jour avant</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Début</label>
                                    <input
                                        required
                                        type="time"
                                        value={eventForm.start_time}
                                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 rounded-[20px] outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Fin</label>
                                    <input
                                        required
                                        type="time"
                                        value={eventForm.end_time}
                                        onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                                        className="w-full px-6 py-4 bg-slate-50 rounded-[20px] outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 relative">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Contact lié (Optionnel)</label>
                                <div
                                    onClick={() => setShowContactPicker(!showContactPicker)}
                                    className="w-full px-6 py-4 bg-slate-50 rounded-[20px] shadow-sm font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all cursor-pointer flex items-center justify-between"
                                >
                                    <span className={eventForm.contact_id ? 'text-slate-900' : 'text-slate-400'}>
                                        {eventForm.contact_id
                                            ? `${contacts.find(c => c.id === eventForm.contact_id)?.first_name} ${contacts.find(c => c.id === eventForm.contact_id)?.last_name}`
                                            : 'Sélectionner un contact'
                                        }
                                    </span>
                                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${showContactPicker ? 'rotate-180' : ''}`} />
                                </div>

                                {showContactPicker && (
                                    <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-[24px] shadow-2xl border border-slate-100 z-[120] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                                        <div className="p-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                                            <Search size={18} className="text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                value={contactSearch}
                                                onChange={(e) => setContactSearch(e.target.value)}
                                                placeholder="Rechercher un nom ou société..."
                                                className="bg-transparent outline-none font-bold text-sm flex-1"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                            <div
                                                onClick={() => {
                                                    setEventForm({ ...eventForm, contact_id: '' });
                                                    setShowContactPicker(false);
                                                }}
                                                className="p-4 hover:bg-slate-50 cursor-pointer text-xs font-black uppercase text-slate-400 italic tracking-widest"
                                            >
                                                Aucun contact
                                            </div>
                                            {filteredContacts.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setEventForm({ ...eventForm, contact_id: c.id });
                                                        setShowContactPicker(false);
                                                        setContactSearch('');
                                                    }}
                                                    className="p-4 hover:bg-indigo-50 border-b border-slate-50 last:border-0 cursor-pointer group transition-colors"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                {c.first_name} {c.last_name}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                {c.company || 'Sans société'}
                                                            </p>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${c.category === 'member' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                            {c.category === 'member' ? 'Membre' : 'Prospect'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {filteredContacts.length === 0 && (
                                                <div className="p-8 text-center text-slate-300 italic text-sm">
                                                    Aucun résultat correspondant
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Notes / Description</label>
                                <textarea
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-6 py-4 bg-slate-50 rounded-[20px] outline-none font-bold text-sm border-2 border-transparent focus:border-indigo-100 transition-all resize-none font-sans"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowEventModal(false); setSelectedEvent(null); }}
                                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-[20px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all italic active:scale-95"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-all italic active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={18} strokeWidth={4} /> {selectedEvent?.id ? 'Mettre à jour' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Détails Événement */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 p-8 text-white relative">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                            <div className="flex items-center gap-4 mb-4">
                                <CalendarIcon size={24} className="opacity-70" />
                                <span className="text-[11px] font-black uppercase tracking-widest opacity-80">Rendez-vous</span>
                            </div>
                            <h3 className="text-3xl font-black uppercase italic leading-tight">
                                {selectedEvent.title}
                            </h3>
                        </div>

                        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-start gap-6">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Horaire</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        {new Date(selectedEvent.start_time).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </p>
                                    <p className="text-slate-500 font-medium">
                                        De {formatTime(selectedEvent.start_time)} à {formatTime(selectedEvent.end_time)}
                                    </p>
                                </div>
                            </div>

                            {selectedEvent.contact && (
                                <div className="flex items-start gap-6">
                                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Contact liÉ</p>
                                        <p className="text-lg font-bold text-slate-900">
                                            {selectedEvent.contact.first_name} {selectedEvent.contact.last_name}
                                        </p>
                                        <p className="text-slate-500 font-medium">{selectedEvent.contact.company}</p>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="flex items-start gap-6">
                                    <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl">
                                        <AlignLeft size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Description</p>
                                        <p className="text-slate-600 font-medium italic">{selectedEvent.description}</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 border-t border-slate-100 flex gap-4">
                                <button
                                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                                    className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-[28px] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all italic active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} /> Supprimer
                                </button>
                                <button
                                    onClick={() => {
                                        setEventForm({
                                            title: selectedEvent.title,
                                            description: selectedEvent.description || '',
                                            contact_id: selectedEvent.contact_id || '',
                                            start_date: selectedEvent.start_time.split('T')[0],
                                            start_time: new Date(selectedEvent.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                                            end_time: new Date(selectedEvent.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                                            reminder_minutes: selectedEvent.reminder_minutes
                                        });
                                        setShowEventModal(true);
                                        setShowContactPicker(false);
                                        setContactSearch('');
                                    }}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-[28px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-all italic active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={18} /> Modifier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarManager;
