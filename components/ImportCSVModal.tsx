import React, { useState, useRef } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useToast } from './ToastProvider';

interface ImportCSVModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: 'prospect' | 'member';
    onSuccess: () => void;
}

const ImportCSVModal: React.FC<ImportCSVModalProps> = ({ isOpen, onClose, category, onSuccess }) => {
    const { showToast } = useToast();
    const [importFile, setImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const rows = [
            'Prénom,Nom,Email,Société,Titre,Téléphone,LinkedIn,Site_Web,Secteur,Adresse,Notes,Statut',
            'Jean,Dupont,jean.dupont@exemple.com,Acme Corp,Directeur,+33612345678,https://linkedin.com/in/jeandupont,https://acme.com,Technologie,Paris,Excellent contact,Nouveau',
            'Marie,Martin,marie.martin@exemple.com,Tech Solutions,CTO,+33698765432,,,SaaS,Lyon,Prospect intéressant,Contacté'
        ];
        const csvContent = '\uFEFF' + rows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileName = category === 'member' ? 'Modèle_Import_Membres.csv' : 'Modèle_Import_Prospects.csv';
        link.download = fileName;
        link.click();
    };

    const handleImportCSV = async () => {
        if (!importFile || !supabase) return;

        try {
            const text = await importFile.text();
            const lines = text.split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                showToast('Le fichier CSV est vide ou invalide', 'error');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const contacts: any[] = [];

            const headerMap: { [key: string]: string } = {
                'Prénom': 'first_name',
                'Nom': 'last_name',
                'Email': 'email',
                'Société': 'company',
                'Titre': 'title',
                'Téléphone': 'phone',
                'LinkedIn': 'linkedin_url',
                'Site_Web': 'website',
                'Secteur': 'sector',
                'Adresse': 'address',
                'Notes': 'notes',
                'Statut': 'status'
            };

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const contact: any = { category };

                headers.forEach((header, index) => {
                    const dbField = headerMap[header] || header;
                    if (values[index]) {
                        contact[dbField] = values[index];
                    }
                });

                contacts.push(contact);
            }

            const { error } = await supabase.from('contacts').insert(contacts);

            if (error) throw error;

            showToast(`${contacts.length} contact(s) importé(s) avec succès!`, 'success');
            onSuccess();
            onClose();
            setImportFile(null);
        } catch (err: any) {
            console.error('Error importing CSV:', err);
            showToast(`Erreur d'import: ${err.message}`, 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] p-8 max-w-xl w-full shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black uppercase italic text-slate-900">
                        Importer des {category === 'member' ? 'Membres' : 'Prospects'}
                    </h3>
                    <button
                        onClick={() => { onClose(); setImportFile(null); }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-[20px] p-4">
                        <p className="text-xs font-bold text-indigo-900 mb-2">📋 Étape 1 : Télécharger le modèle</p>
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Télécharger le modèle CSV
                        </button>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-4">
                        <p className="text-xs font-bold text-emerald-900 mb-2">📤 Étape 2 : Importer votre fichier</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-4 py-3 bg-white border-2 border-emerald-300 text-emerald-700 rounded-[16px] font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Upload size={16} />
                            {importFile ? importFile.name : 'Sélectionner un fichier CSV'}
                        </button>
                    </div>

                    {importFile && (
                        <button
                            onClick={handleImportCSV}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-[20px] font-black uppercase text-sm tracking-widest hover:scale-[1.02] transition-all shadow-xl"
                        >
                            Importer {importFile.name}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportCSVModal;
