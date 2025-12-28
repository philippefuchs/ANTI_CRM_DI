import React, { useState, useRef, useEffect } from 'react';
// Removed Waveform and MicOff as they are not available in lucide-react or unused.
import { Mic, Phone, PhoneOff, MessageSquare, Volume2 } from 'lucide-react';
import { getGeminiClient, encodeToBase64, decodeBase64, decodeAudioData } from '../services/geminiService';
import { Modality, LiveServerMessage } from '@google/genai';

const VoiceAssistant: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsActive(false);
    setIsListening(false);
  };

  const startSession = async () => {
    try {
      const ai = getGeminiClient();
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsListening(true);
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64 = encodeToBase64(new Uint8Array(int16.buffer));
              
              // Rely on sessionPromise to avoid race conditions.
              sessionPromise.then(session => {
                session.sendRealtimeInput({ 
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' } 
                });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Process model's audio output
            if (msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
              const base64 = msg.serverContent.modelTurn.parts[0].inlineData.data;
              const bytes = decodeBase64(base64);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(bytes, outputCtx, 24000, 1);
              
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle transcriptions
            if (msg.serverContent?.outputTranscription) {
               setTranscription(prev => [...prev.slice(-4), `AI: ${msg.serverContent?.outputTranscription?.text}`]);
            }
            if (msg.serverContent?.inputTranscription) {
               setTranscription(prev => [...prev.slice(-4), `You: ${msg.serverContent?.inputTranscription?.text}`]);
            }

            // Handle interruptions
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (err) => console.error('Live Error:', err),
          onclose: () => stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are a professional sales assistant. Help me prepare for calls, draft emails, and manage leads.',
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Microphone access or API error. Check permissions.');
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center space-y-8 min-h-[60vh]">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">Sales Co-Pilot</h2>
        <p className="text-slate-500">Real-time voice consultation for your lead generation strategy.</p>
      </div>

      <div className="relative">
        <div className={`w-64 h-64 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${
          isActive ? 'border-indigo-500 bg-indigo-50 scale-110 shadow-2xl shadow-indigo-200' : 'border-slate-200 bg-white'
        }`}>
          {isActive ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-1.5 h-8 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}></div>
              ))}
            </div>
          ) : (
            <div className="p-8 bg-slate-100 rounded-full text-slate-300">
              <Mic size={64} />
            </div>
          )}
        </div>
        
        <button
          onClick={isActive ? stopSession : startSession}
          className={`absolute bottom-0 right-0 p-6 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 ${
            isActive ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
          }`}
        >
          {isActive ? <PhoneOff size={32} /> : <Phone size={32} />}
        </button>
      </div>

      <div className="w-full max-w-xl">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">
            <span className="flex items-center gap-2"><MessageSquare size={14} /> Live Transcription</span>
            <span className="flex items-center gap-1"><Volume2 size={14} /> Voice: Puck</span>
          </div>
          
          <div className="space-y-3 min-h-[120px] max-h-[200px] overflow-y-auto">
            {transcription.length > 0 ? (
              transcription.map((line, i) => (
                <p key={i} className={`text-sm leading-relaxed ${line.startsWith('You:') ? 'text-slate-500' : 'text-slate-900 font-medium'}`}>
                  {line}
                </p>
              ))
            ) : (
              <p className="text-slate-400 text-sm italic">Press the phone icon to start a conversation...</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-center">
        {[
          { title: "Prep Calls", desc: "Roleplay with AI before important demos" },
          { title: "Draft Copy", desc: "Dictate email templates on the fly" },
          { title: "Quick CRM", desc: "Ask for prospect details hands-free" },
        ].map((item, i) => (
          <div key={i} className="p-4 rounded-xl bg-slate-100/50 border border-slate-200/50">
            <h4 className="text-xs font-bold text-slate-900 uppercase mb-1">{item.title}</h4>
            <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceAssistant;