
import { GoogleGenAI, Type } from "@google/genai";

export const getGeminiClient = () => {
  const apiKey = (typeof process !== 'undefined' && (process.env.GEMINI_API_KEY || process.env.API_KEY)) || "";
  if (!apiKey) console.warn("GEMINI_API_KEY is missing!");
  return new GoogleGenAI({ apiKey });
};

// --- Extraction visuelle de carte de visite ---
export const extractContactFromImage = async (base64Image: string) => {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: "Analyse cette carte de visite. Extrais : Prénom, Nom, Poste, Société, Email, Téléphone, Site Web, LinkedIn. Retourne un JSON uniquement." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            company: { type: Type.STRING },
            title: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            website: { type: Type.STRING },
            linkedinUrl: { type: Type.STRING },
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Image extraction error:", e);
    throw e;
  }
};

// --- Smart Data Enrichment ---
export const enrichContactFromText = async (text: string) => {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `IDENTIFIER COORDONNÉES DIRECTES : "${text}"`,
      config: {
        systemInstruction: `Tu es un Expert en Renseignement Commercial (OSINT). Ta mission est de trouver les coordonnées de contact DIRECTES (Email et Téléphone) d'une personne au sein d'une entreprise donnée. Ne propose que des informations vérifiables ou des patterns d'email probables. Retourne exclusivement l'objet JSON structuré.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            company: { type: Type.STRING },
            title: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            website: { type: Type.STRING },
            sector: { type: Type.STRING },
            notes: { type: Type.STRING },
            matchConfidence: { type: Type.STRING }
          },
          required: ["firstName", "lastName", "company"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return { data, sources: [] };
  } catch (e) {
    console.error("Enrichment error:", e);
    throw e;
  }
};

export const generateCampaignContent = async (prospectName: string, company: string, topic: string) => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: `Write a professional personalized outreach email to ${prospectName} at ${company} about ${topic}. Keep it concise and persuasive.`,
  });
  return response.text;
};

export const editProspectProfileImage = async (base64Image: string, prompt: string) => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export function encodeToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
