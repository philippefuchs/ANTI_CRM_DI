
import { GoogleGenAI, Type } from "@google/genai";

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Extraction visuelle de carte de visite ---
export const extractContactFromImage = async (base64Image: string) => {
  const ai = getGeminiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

// --- Smart Data Enrichment (Contact Discovery Focus) ---
export const enrichContactFromText = async (text: string) => {
  const ai = getGeminiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `IDENTIFIER COORDONNÉES DIRECTES : "${text}"`,
      config: {
        systemInstruction: `Tu es un Expert en Renseignement Commercial (OSINT). Ta mission est de trouver les coordonnées de contact DIRECTES (Email et Téléphone) d'une personne au sein d'une entreprise donnée.

        PROTOCOLE DE RECHERCHE :
        1. EXTRACTION : Identifie le Prénom, Nom et l'Entreprise cible.
        2. RECHERCHE GOOGLE : Cherche spécifiquement l'email et le téléphone sur :
           - Le site web officiel de la société (mentions légales, contact, équipe).
           - Des annuaires professionnels, signatures de mail publiques, ou bases de données de presse.
        3. PRÉDICTION D'EMAIL : Si l'email exact n'est pas trouvé mais que tu identifies le format utilisé par l'entreprise (ex: p.nom@entreprise.com), propose-le en précisant le degré de confiance.
        4. TÉLÉPHONE : Cherche le numéro de bureau, le standard ou le mobile s'il est public.

        STRICTE INTERDICTION :
        - Ne cherche plus de lien LinkedIn. Ignore totalement les profils de réseaux sociaux.
        - Ne propose que des informations vérifiables ou des patterns d'email probables.

        FORMAT DE RÉPONSE : Retourne exclusivement l'objet JSON structuré.`,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstName: { type: Type.STRING },
            lastName: { type: Type.STRING },
            company: { type: Type.STRING },
            title: { type: Type.STRING, description: "Poste exact occupé" },
            email: { type: Type.STRING, description: "Email professionnel (vérifié ou probable)" },
            phone: { type: Type.STRING, description: "Numéro de téléphone direct ou standard" },
            website: { type: Type.STRING, description: "Site web officiel de la société" },
            sector: { type: Type.STRING },
            notes: { type: Type.STRING, description: "Commentaires sur la source ou le format d'email détecté" },
            matchConfidence: { 
              type: Type.STRING, 
              description: "High si email/tel trouvés, Medium si format d'email déduit, Low si info parcellaire" 
            }
          },
          required: ["firstName", "lastName", "company"]
        }
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Source web",
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    const data = JSON.parse(response.text || "{}");

    return { data, sources };
  } catch (e) {
    console.error("Enrichment error:", e);
    throw e;
  }
};

export const generateCampaignContent = async (prospectName: string, company: string, topic: string) => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write a professional personalized outreach email to ${prospectName} at ${company} about ${topic}. Keep it concise and persuasive.`,
  });
  return response.text;
};

export const editProspectProfileImage = async (base64Image: string, prompt: string) => {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
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
