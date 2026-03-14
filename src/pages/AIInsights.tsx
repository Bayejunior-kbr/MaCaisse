import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Loader2, 
  Zap, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  Target,
  Lightbulb,
  Rocket
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

interface PathStep {
  title: string;
  description: string;
  type: 'growth' | 'warning' | 'action' | 'success';
  priority: 'high' | 'medium' | 'low';
}

interface AIResponse {
  summary: string;
  steps: PathStep[];
}

export default function AIInsights() {
  const [insights, setInsights] = useState<AIResponse | null>(null);
  const [rawInsights, setRawInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchInsights = async () => {
    if (user?.plan !== 'premium') return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/ai/insights-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`Impossible de récupérer les données de la boutique (${res.status})`);
      }

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Le serveur a renvoyé une réponse invalide (non-JSON)");
      }

      const { products: rawProducts, sales: rawSales } = await res.json();

      // Data reduction strategy to avoid token limits
      // 1. Simplify products: only essential fields and limit count
      const products = rawProducts.map((p: any) => ({
        name: p.name,
        qty: p.quantity,
        min: p.min_quantity,
        price: p.sale_price,
        cost: p.purchase_price
      })).slice(0, 100); // Limit to top 100 products

      // 2. Summarize sales: instead of every record, group by product
      const salesSummary: Record<string, { qty: number, revenue: number, profit: number }> = {};
      rawSales.forEach((s: any) => {
        if (!salesSummary[s.productName]) {
          salesSummary[s.productName] = { qty: 0, revenue: 0, profit: 0 };
        }
        salesSummary[s.productName].qty += Number(s.quantity);
        salesSummary[s.productName].revenue += Number(s.total_amount);
        salesSummary[s.productName].profit += Number(s.total_profit);
      });

      // Convert summary to a more compact array
      const summarizedSales = Object.entries(salesSummary).map(([name, stats]) => ({
        name,
        ...stats
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 50); // Top 50 selling products

      // Call Gemini API directly from frontend
      let apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY.");
      }
      
      // Clean up key if it has quotes or whitespace
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyse les données suivantes pour un système ERP et fournis des insights, tendances et recommandations concises sous forme de JSON. 
        Boutique: ${user.shopName}
        Produits (échantillon): ${JSON.stringify(products)}
        Ventes (30 derniers jours, résumé par produit): ${JSON.stringify(summarizedSales)}
        
        Format attendu (JSON uniquement):
        {
          "summary": "Résumé de la situation...",
          "steps": [
            {
              "title": "Titre de l'étape",
              "description": "Description détaillée",
              "type": "growth|warning|action|success",
              "priority": "high|medium|low"
            }
          ]
        }`,
        config: {
          systemInstruction: "Tu es un expert en analyse de données commerciales pour les PME. Tes réponses doivent être professionnelles, en français et au format JSON strict.",
          responseMimeType: "application/json"
        }
      });

      const response = await model;
      const analysis = response.text;
      
      try {
        // Try to parse as JSON
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setInsights(parsed);
        } else {
          setRawInsights(analysis);
        }
      } catch (e) {
        setRawInsights(analysis);
      }
    } catch (err: any) {
      console.error("AI Insights error:", err);
      setError(err.message || "Une erreur est survenue lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.plan === 'premium') {
      fetchInsights();
    }
  }, [user]);

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'growth': return <TrendingUp size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'action': return <Target size={20} />;
      case 'success': return <CheckCircle2 size={20} />;
      default: return <Lightbulb size={20} />;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'growth': return "bg-blue-500 text-white border-blue-200";
      case 'warning': return "bg-amber-500 text-white border-amber-200";
      case 'action': return "bg-emerald-500 text-white border-emerald-200";
      case 'success': return "bg-indigo-500 text-white border-indigo-200";
      default: return "bg-slate-500 text-white border-slate-200";
    }
  };

  const getStepBg = (type: string) => {
    switch (type) {
      case 'growth': return "bg-blue-50 border-blue-100";
      case 'warning': return "bg-amber-50 border-amber-100";
      case 'action': return "bg-emerald-50 border-emerald-100";
      case 'success': return "bg-indigo-50 border-indigo-100";
      default: return "bg-slate-50 border-slate-100";
    }
  };

  if (user && user.plan !== 'premium') {
    return (
      <div className="h-[calc(100vh-160px)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Fonctionnalité Premium</h2>
          <p className="text-slate-500 mb-8">
            L'analyse intelligente par IA est réservée aux membres Premium. Boostez votre boutique avec des conseils stratégiques personnalisés.
          </p>
          <Link 
            to="/subscription"
            className="block w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <Zap size={20} />
            Découvrir ShopMaster Pro Premium
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="text-emerald-600" />
            Intelligence Artificielle ShopMaster Pro
          </h2>
          <p className="text-slate-500">Analyses prédictives et conseils stratégiques pour votre boutique</p>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
          Actualiser l'analyse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Top Performances</h3>
          <p className="text-sm text-slate-500">Identification automatique de vos produits les plus rentables.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Alertes Stock</h3>
          <p className="text-sm text-slate-500">Prévision des ruptures de stock avant qu'elles n'arrivent.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Package size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Réapprovisionnement</h3>
          <p className="text-sm text-slate-500">Suggestions intelligentes basées sur vos cycles de vente.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
        <div className="bg-emerald-600 p-6 flex items-center gap-3 text-white">
          <Sparkles size={24} />
          <h3 className="text-lg font-bold">Le Chemin de votre Croissance</h3>
        </div>
        
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <BrainCircuit size={64} className="text-emerald-100 animate-pulse" />
                <Loader2 size={32} className="text-emerald-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-slate-500 font-medium animate-pulse">L'IA trace votre chemin de réussite...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="text-red-600 font-medium">{error}</p>
              <button 
                onClick={fetchInsights}
                className="mt-4 text-emerald-600 font-bold hover:underline"
              >
                Réessayer
              </button>
            </div>
          ) : insights ? (
            <div className="space-y-12">
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <h4 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                  <Lightbulb size={18} />
                  Résumé Stratégique
                </h4>
                <p className="text-emerald-900/70 leading-relaxed">
                  {insights.summary}
                </p>
              </div>

              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100 hidden md:block" />

                <div className="space-y-10">
                  {insights.steps.map((step, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative flex flex-col md:flex-row gap-6 md:items-start"
                    >
                      {/* Step Indicator */}
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm",
                        getStepColor(step.type)
                      )}>
                        {getStepIcon(step.type)}
                      </div>

                      {/* Content Card */}
                      <div className={cn(
                        "flex-1 p-6 rounded-3xl border transition-all hover:shadow-md",
                        getStepBg(step.type)
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-slate-800 text-lg">{step.title}</h4>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            step.priority === 'high' ? "bg-red-100 text-red-600" : 
                            step.priority === 'medium' ? "bg-amber-100 text-amber-600" : 
                            "bg-blue-100 text-blue-600"
                          )}>
                            Priorité {step.priority === 'high' ? 'Haute' : step.priority === 'medium' ? 'Moyenne' : 'Basse'}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          {step.description}
                        </p>
                        
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span>Étape {index + 1}</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Final Milestone */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: insights.steps.length * 0.1 }}
                    className="flex flex-col items-center justify-center pt-10 text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 mb-4">
                      <Rocket size={32} />
                    </div>
                    <h4 className="font-bold text-slate-800">Objectif : Croissance Maximale</h4>
                    <p className="text-sm text-slate-500">Suivez ce chemin pour optimiser vos revenus.</p>
                  </motion.div>
                </div>
              </div>
            </div>
          ) : rawInsights ? (
            <div className="p-8 prose max-w-none">
              <ReactMarkdown>{rawInsights}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
              <p>Cliquez sur "Actualiser l'analyse" pour générer votre premier rapport.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2 text-emerald-900">Besoin d'une analyse plus poussée ?</h3>
          <p className="text-emerald-700/70 mb-6 max-w-md">Passez à la version Premium pour débloquer les prévisions sur 6 mois et l'intégration multi-boutiques.</p>
          <Link to="/subscription" className="inline-block px-6 py-3 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            Découvrir ShopMaster Pro Premium
          </Link>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-3xl -mr-20 -mt-20 rounded-full"></div>
      </div>
    </div>
  );
}
