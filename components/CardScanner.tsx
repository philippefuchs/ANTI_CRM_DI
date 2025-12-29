
import React, { useState, useRef, useCallback } from 'react';
import {
  Scan, Camera, Upload, RefreshCw, Check, X, Building2, User, Mail, Globe,
  Linkedin, UserPlus, Zap, Trash2, Smartphone, ShieldCheck, AlertCircle
} from 'lucide-react';
import { extractContactFromImage, enrichContactFromText } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { ProspectStatus } from '../types';

const CardScanner: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await extractContactFromImage(base64.split(',')[1]);
      setResult(data);
    } catch (err: any) {
      console.error("Scan Error:", err);
      const msg = err?.message || "Erreur inconnue";
      if (msg.includes("API key not found")) {
        setError("Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY.");
      } else {
        setError(`Erreur d'analyse : ${msg}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Impossible d'accéder à la caméra.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg');

    // Arrêter le stream
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());

    setImage(base64);
    setShowCamera(false);
    processImage(base64);
  };

  const handleSmartEnrich = async () => {
    if (!result) return;
    setIsEnriching(true);
    try {
      const searchKey = `${result.firstName || ''} ${result.lastName || ''} ${result.company || ''}`.trim();
      const enrichment = await enrichContactFromText(searchKey);
      setResult({
        ...result,
        ...enrichment.data,
        notes: enrichment.data.notes || result.notes
      });
    } catch (err) {
      setError("Échec de l'enrichissement supplémentaire.");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSave = async (category: 'prospect' | 'member') => {
    if (!result || !supabase) return;
    setIsSaving(true);
    try {
      const payload = {
        first_name: result.firstName || '',
        last_name: result.lastName || '',
        company: result.company || '',
        title: result.title || '',
        email: result.email?.toLowerCase().trim() || null,
        phone: result.phone || null,
        linkedin_url: result.linkedinUrl || null,
        website: result.website || null,
        category: category.toLowerCase().trim(),
        status: category === 'member' ? 'Active' : ProspectStatus.NEW,
        notes: `Extrait par Scan IA le ${new Date().toLocaleDateString()}`
      };
      const { error } = await supabase.from('contacts').insert(payload);
      if (error) throw error;
      alert(`✅ Ajouté avec succès ! Retrouvez-le en haut de votre liste dans l'onglet ${category === 'member' ? 'Membres' : 'Prospects'}.`);
      reset();
    } catch (err: any) {
      alert("Erreur d'insertion Cloud: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setShowCamera(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">IA <span className="text-indigo-600">Card Scanner</span></h2>
          <p className="text-sm font-medium text-slate-500">Numérisez instantanément vos cartes de visite physiques.</p>
        </div>
        <div className="flex gap-4">
          {!image && !showCamera && (
            <>
              <button onClick={startCamera} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 transition hover:bg-indigo-700 active:scale-95">
                <Camera size={18} /> Prendre une photo
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="px-8 py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition hover:bg-slate-50 active:scale-95">
                <Upload size={18} /> Importer un fichier
              </button>
            </>
          )}
          {image && (
            <button onClick={reset} className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-100 transition">
              <Trash2 size={16} /> Annuler
            </button>
          )}
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* PREVIEW AREA */}
        <div className="space-y-6">
          {showCamera && (
            <div className="relative aspect-[3/2] bg-black rounded-[40px] overflow-hidden shadow-2xl border-4 border-indigo-500">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                <div className="w-full h-full border-2 border-white/50 border-dashed rounded-lg" />
              </div>
              <button onClick={capturePhoto} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition">
                <div className="w-16 h-16 rounded-full border-4 border-slate-200" />
              </button>
            </div>
          )}

          {!showCamera && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 aspect-[3/2] rounded-[48px] flex items-center justify-center overflow-hidden relative shadow-inner">
              {image ? (
                <img src={image} className="w-full h-full object-contain p-4" alt="Card" />
              ) : (
                <div className="text-center space-y-4 opacity-40">
                  <Scan size={64} className="mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Aperçu du scan</p>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-sm flex items-center justify-center">
                  <div className="absolute w-full h-1 bg-indigo-500 animate-[scan_2s_infinite] shadow-[0_0_15px_rgba(99,102,241,1)]" />
                  <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-indigo-600" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Analyse Gemini Vision...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-3xl flex items-center gap-4 animate-in shake duration-500">
              <AlertCircle size={24} />
              <p className="text-xs font-black uppercase">{error}</p>
            </div>
          )}
        </div>

        {/* RESULTS AREA */}
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">Fiche Extraite</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Edition manuelle possible</p>
            </div>
            {result && (
              <button
                onClick={handleSmartEnrich}
                disabled={isEnriching}
                className="px-5 py-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-amber-100 transition disabled:opacity-50"
              >
                {isEnriching ? <RefreshCw className="animate-spin" size={12} /> : <Zap size={12} />}
                Smart Enrich
              </button>
            )}
          </div>

          <div className="flex-1 p-10 space-y-6">
            {!result && !isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                <User size={48} />
                <p className="text-[10px] font-black uppercase tracking-widest">Les données apparaîtront ici</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Prénom</label>
                  <input value={result?.firstName || ''} onChange={e => setResult({ ...result, firstName: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nom</label>
                  <input value={result?.lastName || ''} onChange={e => setResult({ ...result, lastName: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Société</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input value={result?.company || ''} onChange={e => setResult({ ...result, company: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Poste</label>
                  <input value={result?.title || ''} onChange={e => setResult({ ...result, title: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input value={result?.email || ''} onChange={e => setResult({ ...result, email: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-400 ml-2">LinkedIn URL</label>
                  <div className="relative">
                    <Linkedin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input value={result?.linkedinUrl || ''} onChange={e => setResult({ ...result, linkedinUrl: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="p-10 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSave('prospect')}
                disabled={isSaving}
                className="py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition flex items-center justify-center gap-2"
              >
                <UserPlus size={16} /> Save as Prospect
              </button>
              <button
                onClick={() => handleSave('member')}
                disabled={isSaving}
                className="py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} /> Save as Member
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CardScanner;
