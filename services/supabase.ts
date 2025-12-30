
import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  try {
    const saved = localStorage.getItem('leadgen_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Nettoyage de l'URL pour éviter les trailing slashes qui peuvent causer des fetch errors
      if (parsed.url) {
        parsed.url = parsed.url.trim().replace(/\/$/, "");
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error loading Supabase config from localStorage", e);
  }
  // Valeurs par défaut depuis les variables d'environnement
  const output = {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_KEY || ''
  };
  console.log("Supabase Config Debug:", output);
  console.log("Meta Env:", import.meta.env);
  return output;
};

const config = getSupabaseConfig();

const isValidUrl = (urlString: string) => {
  if (!urlString) return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// Initialize Supabase only if URL is valid and key is present
export const supabase = (config.url && isValidUrl(config.url) && config.key)
  ? createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: { 'x-application-name': 'leadgen-ai-pro' },
    },
  })
  : null;

export const isSupabaseConfigured = () => !!supabase;

export const saveSupabaseConfig = (url: string, key: string) => {
  const cleanUrl = url.trim().replace(/\/$/, "");
  localStorage.setItem('leadgen_supabase_config', JSON.stringify({ url: cleanUrl, key: key.trim() }));
  window.location.reload();
};
