/**
 * CONFIGURATION DE L'API GEMINI
 * 
 * ATTENTION : Pour un projet réel, utilisez les variables d'environnement.
 * Cette clé est intégrée ici pour débloquer l'utilisation immédiate.
 */
export const GEMINI_API_KEY = "AIzaSyBSj0kVsNbXVT8BhaAFRSyFtahydkE36Ys";

// Fonction utilitaire pour nettoyer la clé
export const getCleanApiKey = () => {
  return GEMINI_API_KEY.trim().replace(/^["']|["']$/g, '');
};