import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { getCleanApiKey } from '../lib/gemini-config';
import { ImageIcon, Loader2, Sparkles, Download, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';

const AI_MODEL = "gemini-3.1-flash-image-preview";

export default function LogoGenerator() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLogo = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = getCleanApiKey();
      if (!apiKey || apiKey === "undefined") {
        throw new Error("Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: {
          parts: [
            {
              text: "A professional, minimalist logo for 'ShopMaster Pro', a modern commerce and AI management application. The logo features a stylized, abstract shopping cart or a shopping bag integrated with a digital circuit or a glowing AI brain node. Color palette: Deep Indigo (#4F46E5) and Emerald Green (#10B981) on a clean white background. Style: Modern, flat design, vector art, high-end tech aesthetic, symmetrical, elegant. No text, just the icon. High resolution, 4K.",
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setLogoUrl(`data:image/png;base64,${base64EncodeString}`);
          return;
        }
      }
      throw new Error("Aucune image n'a été générée.");
    } catch (err: any) {
      console.error("Logo generation failed:", err);
      let msg = err.message || "La génération du logo a échoué.";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "Quota d'IA épuisé pour aujourd'hui. Veuillez réessayer demain ou passer à un forfait payant pour plus de limites.";
      }
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLogo = () => {
    if (!logoUrl) return;
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'shopmaster-pro-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Sparkles className="text-indigo-600" />
            Générateur de Logo IA
          </h1>
          <p className="text-slate-500 mt-2">
            Créez une identité visuelle unique pour ShopMaster Pro en quelques secondes.
          </p>
        </div>
        <button
          onClick={generateLogo}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Génération...
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              Générer un nouveau logo
            </>
          )}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Logo Display */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex items-center justify-center aspect-square relative overflow-hidden">
          <AnimatePresence mode="wait">
            {logoUrl ? (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center"
              >
                <img
                  src={logoUrl}
                  alt="ShopMaster Pro Logo"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={downloadLogo}
                  className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold"
                >
                  <Download size={16} />
                  Télécharger le logo
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <ImageIcon size={48} />
                </div>
                <p className="text-slate-400 font-medium">
                  Cliquez sur générer pour créer votre logo professionnel.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decorative background */}
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Info & Tips */}
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <h3 className="text-indigo-900 font-bold flex items-center gap-2">
              <ShoppingBag size={18} />
              Identité de Marque
            </h3>
            <p className="text-indigo-800/70 text-sm mt-2 leading-relaxed">
              Ce logo a été conçu pour refléter la modernité, la précision et l'intelligence de ShopMaster Pro. Il utilise des teintes d'Indigo pour le professionnalisme et d'Émeraude pour la croissance.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-800">Conseils d'utilisation :</h4>
            <ul className="space-y-3">
              {[
                "Utilisez-le comme icône de profil sur vos réseaux sociaux.",
                "Intégrez-le au début et à la fin de votre vidéo publicitaire.",
                "Ajoutez-le sur vos factures et devis pour plus de professionnalisme.",
                "Le format PNG généré est idéal pour le web et les présentations."
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
