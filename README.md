# LeadGen AI Pro

Une application CRM moderne et performante pour la gestion de prospects et de membres, propulsée par l'IA.

## Fonctionnalités Clés
- **Gestion de Contacts** : Prospects et Membres, avec import CSV et dédoublonnage.
- **Enrichissement IA** : Complétion automatique des profils via Gemini.
- **Communication** : Templates d'emails et gestion de campagnes.
- **Organisation** : Pipeline Kanban, Calendrier et Rappels.

## Installation Locale

1.  **Prérequis** : Node.js (v18+) installé.
2.  **Installation des dépendances** :
    ```bash
    npm install
    ```
3.  **Configuration** :
    Créez un fichier `.env.local` à la racine avec vos clés API (voir `.env.example` si disponible ou demandez à l'administrateur).
    ```env
    VITE_SUPABASE_URL=votre_url_supabase
    VITE_SUPABASE_KEY=votre_cle_publique
    GEMINI_API_KEY=votre_cle_gemini
    ```
4.  **Lancement** :
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:3000`.

## Déploiement

Pour déployer sur Vercel :
1.  Installez Vercel CLI : `npm i -g vercel`
2.  Connectez-vous : `vercel login`
3.  Déployez : `vercel --prod`

## Architecture
- **Frontend** : React, Vite, TailwindCSS
- **Backend** : Supabase (Base de données, Auth)
- **Icônes** : Lucide React
