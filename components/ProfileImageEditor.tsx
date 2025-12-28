
import React, { useState, useRef } from 'react';
import { ImageIcon, Wand2, RefreshCw, Upload, Download, Sparkles } from 'lucide-react';
import { editProspectProfileImage } from '../services/geminiService';

const ProfileImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Add a professional business suit and a clean office background');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    try {
      const base64Data = originalImage.split(',')[1];
      const result = await editProspectProfileImage(base64Data, prompt);
      if (result) {
        setEditedImage(result);
      }
    } catch (error) {
      console.error('Image processing failed:', error);
      alert('Failed to edit image. Check your Gemini API status.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">AI Prospect Enhancer</h2>
        <p className="text-slate-500">Professionally edit prospect profile photos using Gemini 2.5 Flash Image.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Original */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <ImageIcon size={18} className="text-slate-400" /> Original Photo
            </h3>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1"
            >
              <Upload size={14} /> Replace
            </button>
          </div>
          <div className="aspect-square bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
            {originalImage ? (
              <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-8">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4">
                  <Upload size={20} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">Upload a profile photo to start editing</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Select File
                </button>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-500" /> AI Result
            </h3>
            {editedImage && (
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = editedImage;
                  link.download = 'edited-profile.png';
                  link.click();
                }}
                className="text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Download size={14} /> Save
              </button>
            )}
          </div>
          <div className="aspect-square bg-slate-100 rounded-2xl border-2 border-slate-200 flex items-center justify-center overflow-hidden relative">
            {isProcessing ? (
              <div className="text-center">
                <RefreshCw className="animate-spin text-indigo-600 mx-auto mb-4" size={32} />
                <p className="text-sm font-medium text-slate-600">Gemini is thinking...</p>
              </div>
            ) : editedImage ? (
              <img src={editedImage} alt="Edited" className="w-full h-full object-cover animate-in zoom-in duration-300" />
            ) : (
              <div className="text-center p-8 opacity-50">
                <ImageIcon size={32} className="text-slate-300 mx-auto mb-4" />
                <p className="text-sm text-slate-400">Result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Editing Instruction</label>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="e.g., Change background to a library, make it a sketch style..."
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button 
            onClick={handleEdit}
            disabled={!originalImage || isProcessing}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Wand2 size={18} /> Enhance
          </button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {['Retro Filter', 'Professional Headshot', 'Office Background', 'Monochrome'].map(tag => (
            <button 
              key={tag}
              onClick={() => setPrompt(`Apply ${tag.toLowerCase()} to the image`)}
              className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-full text-xs font-medium transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileImageEditor;
