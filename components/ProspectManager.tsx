
import React, { useState, useEffect, useRef } from 'react';
import { Prospect, ProspectStatus } from '../types';
import { 
  Plus, Search, Filter, Download, MoreVertical, 
  Edit2, Trash2, Mail, ExternalLink, Upload, 
  UserPlus, X, Check, AlertCircle, FileSpreadsheet, FileText
} from 'lucide-react';

const ProspectManager: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence logic
  useEffect(() => {
    const saved = localStorage.getItem('leadgen_prospects');
    if (saved) {
      try {
        setProspects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load prospects", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('leadgen_prospects', JSON.stringify(prospects));
  }, [prospects]);

  const filteredProspects = prospects.filter(p => 
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: ProspectStatus) => {
    switch (status) {
      case ProspectStatus.NEW: return 'bg-blue-50 text-blue-700 border-blue-100';
      case ProspectStatus.CONTACTED: return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case ProspectStatus.INTERESTED: return 'bg-purple-50 text-purple-700 border-purple-100';
      case ProspectStatus.CLOSED: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case ProspectStatus.LOST: return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleAddOrEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      company: formData.get('company') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      linkedinUrl: formData.get('linkedinUrl') as string,
      status: formData.get('status') as ProspectStatus,
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(t => t),
      notes: formData.get('notes') as string,
    };

    if (editingProspect) {
      setProspects(prev => prev.map(p => p.id === editingProspect.id ? { ...p, ...data, lastInteraction: new Date().toISOString() } : p));
    } else {
      // Fix: Added missing 'category' property to satisfy the Contact interface required by Prospect type alias
      const newProspect: Prospect = {
        ...data,
        id: crypto.randomUUID(),
        category: 'prospect',
        createdAt: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
      };
      setProspects(prev => [newProspect, ...prev]);
    }
    setIsModalOpen(false);
    setEditingProspect(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce prospect ?')) {
      setProspects(prev => prev.filter(p => p.id !== id));
    }
  };

  const downloadSampleCSV = () => {
    const headers = ['Prénom', 'Nom', 'Entreprise', 'Email', 'Téléphone', 'LinkedIn'];
    const sampleRows = [
      ['Jean', 'Dupont', 'TechCorp', 'jean@techcorp.com', '0612345678', 'https://linkedin.com/in/jeandupont'],
      ['Marie', 'Curie', 'ScienceLab', 'marie@sciencelab.fr', '0145678900', 'https://linkedin.com/in/mariecurie']
    ];
    const csvContent = [headers, ...sampleRows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "modele_import_prospects.csv");
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const newLeads: Prospect[] = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const entry: any = {};
        headers.forEach((h, i) => {
          if (h.includes('prénom') || h.includes('first')) entry.firstName = values[i];
          if (h.includes('nom') || h.includes('last')) entry.lastName = values[i];
          if (h.includes('entreprise') || h.includes('company')) entry.company = values[i];
          if (h.includes('email')) entry.email = values[i];
          if (h.includes('tel') || h.includes('phone')) entry.phone = values[i];
          if (h.includes('linkedin')) entry.linkedinUrl = values[i];
        });

        // Fix: Added missing 'category' property to satisfy the Contact interface required by Prospect type alias
        return {
          id: crypto.randomUUID(),
          firstName: entry.firstName || 'Importé',
          lastName: entry.lastName || 'Lead',
          company: entry.company || 'Inconnue',
          email: entry.email || '',
          phone: entry.phone || '',
          linkedinUrl: entry.linkedinUrl || '',
          status: ProspectStatus.NEW,
          category: 'prospect',
          tags: ['Import CSV'],
          notes: 'Importé via fichier CSV',
          createdAt: new Date().toISOString(),
          lastInteraction: new Date().toISOString(),
        };
      });

      setProspects(prev => [...newLeads, ...prev]);
      alert(`${newLeads.length} prospects importés avec succès.`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportToCSV = () => {
    if (prospects.length === 0) return;
    const headers = ['Prénom', 'Nom', 'Entreprise', 'Email', 'Téléphone', 'LinkedIn', 'Statut'];
    const rows = prospects.map(p => [p.firstName, p.lastName, p.company, p.email, p.phone, p.linkedinUrl, p.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "prospects_export.csv");
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
           <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher (nom, email, entreprise)..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-sm">
                <Plus size={18} /> Nouveau
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition">
                <Upload size={18} /> Importer
             </button>
           </div>
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
          <button onClick={downloadSampleCSV} className="flex items-center gap-2 px-4 py-2 text-indigo-600 font-medium border border-indigo-100 bg-indigo-50/50 rounded-lg hover:bg-indigo-50 transition" title="Télécharger le modèle CSV">
            <FileText size={18} /> Modèle
          </button>
          <button onClick={exportToCSV} disabled={prospects.length === 0} className="flex items-center gap-2 px-4 py-2 text-slate-600 font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition">
            <Download size={18} /> Export
          </button>
          <button onClick={() => { if(confirm('Vider toute la base ?')) setProspects([]); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="Tout supprimer">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredProspects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Prospect</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Entreprise</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tags</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProspects.map((prospect) => (
                  <tr key={prospect.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
                          {prospect.firstName[0]}{prospect.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{prospect.firstName} {prospect.lastName}</p>
                          <p className="text-xs text-slate-500">{prospect.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700 font-medium">{prospect.company}</span>
                        <span className="text-[10px] text-slate-400">{prospect.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wider ${getStatusColor(prospect.status)}`}>
                        {prospect.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {prospect.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">{tag}</span>
                        ))}
                        {prospect.tags.length > 2 && <span className="text-[9px] text-slate-400 font-bold">+{prospect.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProspect(prospect); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Modifier">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(prospect.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                        {prospect.linkedinUrl && (
                          <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
               <UserPlus size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Aucun prospect</h3>
              <p className="text-slate-500 max-w-xs mx-auto text-sm">Votre base est actuellement vide. Ajoutez manuellement un prospect ou importez une liste CSV.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                <Plus size={18} /> Créer manuellement
              </button>
              <button onClick={downloadSampleCSV} className="inline-flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition">
                <FileText size={18} /> Télécharger le modèle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Total</p>
          <p className="text-xl font-black text-slate-900">{prospects.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-blue-400 uppercase">Nouveaux</p>
          <p className="text-xl font-black text-slate-900">{prospects.filter(p => p.status === ProspectStatus.NEW).length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-purple-400 uppercase">Intéressés</p>
          <p className="text-xl font-black text-slate-900">{prospects.filter(p => p.status === ProspectStatus.INTERESTED).length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-400 uppercase">Clos</p>
          <p className="text-xl font-black text-slate-900">{prospects.filter(p => p.status === ProspectStatus.CLOSED).length}</p>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">{editingProspect ? 'Modifier le Prospect' : 'Nouveau Prospect'}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingProspect(null); }} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddOrEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Prénom</label>
                  <input required name="firstName" defaultValue={editingProspect?.firstName} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Ex: Jean" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nom</label>
                  <input required name="lastName" defaultValue={editingProspect?.lastName} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Ex: Dupont" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Entreprise</label>
                  <input required name="company" defaultValue={editingProspect?.company} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Ex: TechCorp" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input type="email" name="email" defaultValue={editingProspect?.email} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="jean@techcorp.com" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                  <input name="phone" defaultValue={editingProspect?.phone} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="06..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">LinkedIn URL</label>
                  <input name="linkedinUrl" defaultValue={editingProspect?.linkedinUrl} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="https://linkedin.com/in/..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Statut</label>
                  <select name="status" defaultValue={editingProspect?.status || ProspectStatus.NEW} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition">
                    {Object.values(ProspectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tags (séparés par virgule)</label>
                  <input name="tags" defaultValue={editingProspect?.tags.join(', ')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="SaaS, Tech, Urgent" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
                <textarea name="notes" rows={3} defaultValue={editingProspect?.notes} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Détails additionnels..."></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingProspect(null); }} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
                <button type="submit" className="flex-[2] px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                  <Check size={20} /> {editingProspect ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectManager;
