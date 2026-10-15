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
  Rocket,
  PieChart
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { secureFetch } from '../lib/api';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface PathStep {
  title: string;
  description: string;
  type: 'growth' | 'warning' | 'action' | 'success';
  priority: 'high' | 'medium' | 'low';
}

interface ForecastPoint {
  day: string;
  value: number;
}

interface AIResponse {
  summary: string;
  steps: PathStep[];
  forecast: ForecastPoint[];
  financialAdvice: string[];
  inventoryStrategy: string[];
  categoryAnalysis?: {
    category: string;
    performance: 'high' | 'medium' | 'low';
    recommendation: string;
  }[];
  risks: string[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  marketingIdeas: string[];
  roadmap: string[];
}

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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

      const { products: rawProducts, sales: rawSales, categories: rawCategories, expenses: rawExpenses } = await res.json();

      // Data reduction strategy to avoid token limits
      const products = rawProducts.map((p: any) => ({
        name: p.name,
        qty: p.quantity,
        min: p.min_quantity,
        price: p.sale_price,
        cost: p.purchase_price,
        catId: p.category_id
      })).slice(0, 100);

      const categories = rawCategories.map((c: any) => ({
        id: c.id,
        name: c.name
      }));

      const expenses = rawExpenses.map((e: any) => ({
        cat: e.category,
        amount: e.amount,
        date: e.created_at
      })).slice(0, 50);

      const salesSummary: Record<string, { qty: number, revenue: number, profit: number, catId?: number }> = {};
      rawSales.forEach((s: any) => {
        if (!salesSummary[s.productName]) {
          salesSummary[s.productName] = { qty: 0, revenue: 0, profit: 0, catId: s.category_id };
        }
        salesSummary[s.productName].qty += Number(s.quantity);
        salesSummary[s.productName].revenue += Number(s.total_amount);
        salesSummary[s.productName].profit += Number(s.total_profit);
      });

      const summarizedSales = Object.entries(salesSummary).map(([name, stats]) => ({
        name,
        ...stats
      })).sort((a, b) => b.revenue - a.revenue).slice(0, 50);

      const modelResponse = await secureFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyse stratégique de haut niveau pour la boutique: ${user.shopName}.
          Données de la boutique:
          - Catégories: ${JSON.stringify(categories)}
          - Liste des produits (échantillon): ${JSON.stringify(products)}
          - Résumé des ventes (30 derniers jours): ${JSON.stringify(summarizedSales)}
          - Dépenses récentes: ${JSON.stringify(expenses)}

          Fournis une analyse concrète basée sur les chiffres, au format JSON strict, avec au minimum huit actions priorisées.
          Structure attendue:
          {
            "summary": "Résumé de la santé financière et opérationnelle",
            "forecast": [{"day":"Lundi","value":1200}],
            "steps": [{"title":"Action","description":"Détail et impact attendu","type":"growth|warning|action|success","priority":"high|medium|low"}],
            "financialAdvice": ["Conseils de trésorerie, marges et dépenses"],
            "inventoryStrategy": ["Réapprovisionnement et rotation des stocks"],
            "categoryAnalysis": [{"category":"Catégorie","performance":"high|medium|low","recommendation":"Recommandation"}],
            "risks": ["Risque et mesure de réduction"],
            "swot": {"strengths":["Force"],"weaknesses":["Faiblesse"],"opportunities":["Opportunité"],"threats":["Menace"]},
            "marketingIdeas": ["Idée marketing"],
            "roadmap": ["Objectif court, moyen et long terme"]
          }`,
          systemInstruction: "Tu es un consultant en stratégie pour petits commerces. Base tes recommandations sur les données fournies, en français professionnel. Réponds uniquement en JSON.",
          responseMimeType: 'application/json'
        })
      });
      const result = await modelResponse.json();
      if (!modelResponse.ok) throw new Error(result.error || 'Impossible de générer les analyses IA.');
      const analysis = result.text || '';

      
      try {
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
      let msg = err.message || "Une erreur est survenue lors de l'analyse";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        msg = "Quota d'IA épuisé. Veuillez réessayer plus tard.";
      }
      setError(msg);
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
            Découvrir MaCaisse Premium
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <BrainCircuit className="text-emerald-600" size={28} />
            </div>
            IA Stratégique
          </h2>
          <p className="text-slate-500 mt-1">Analyses prédictives et recommandations de croissance</p>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
          Générer une nouvelle analyse
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-20 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-50 rounded-full animate-ping absolute inset-0" />
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center relative z-10">
              <BrainCircuit size={48} className="text-emerald-600 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Analyse en cours...</h3>
            <p className="text-slate-500">Nous étudions vos ventes et vos stocks pour tracer votre chemin de croissance.</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-[2.5rem] border border-red-100 shadow-xl p-20 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Oups ! Une erreur est survenue</h3>
          <p className="text-slate-500 mb-8">{error}</p>
          <button 
            onClick={fetchInsights}
            className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all"
          >
            Réessayer
          </button>
        </div>
      ) : insights ? (
        <div className="space-y-8">
          {/* Summary & Forecast */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Strategic Summary */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Résumé Stratégique</h3>
                </div>
                <p className="text-slate-600 leading-relaxed text-lg">
                  {insights.summary}
                </p>
              </div>

              {/* Forecast Chart */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Prévisions de Ventes (7j)</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    Modèle Prédictif
                  </span>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={insights.forecast}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Sidebar Advice */}
            <div className="space-y-8">
              {/* Financial Advice */}
              <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-white/10 rounded-lg text-emerald-400">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-lg font-bold">Conseils Financiers</h3>
                </div>
                <ul className="space-y-4">
                  {insights.financialAdvice.map((advice, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300 leading-relaxed">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                      {advice}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <AlertTriangle size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-red-900">Analyse des Risques</h3>
                </div>
                <ul className="space-y-4">
                  {insights.risks.map((risk, i) => (
                    <li key={i} className="flex gap-3 text-sm text-red-700/70 leading-relaxed">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Category Analysis */}
          {insights.categoryAnalysis && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-10">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                  <PieChart size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Analyse de Performance par Catégorie</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {insights.categoryAnalysis.map((cat, i) => (
                  <div key={i} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800">{cat.category}</h4>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        cat.performance === 'high' ? "bg-emerald-100 text-emerald-700" :
                        cat.performance === 'medium' ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {cat.performance}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{cat.recommendation}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Steps */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Target size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Plan d'Action Immédiat</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.steps.map((step, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-6 rounded-3xl border transition-all hover:shadow-md group",
                    getStepBg(step.type)
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                      getStepColor(step.type)
                    )}>
                      {getStepIcon(step.type)}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                      step.priority === 'high' ? "bg-red-100 text-red-600" : 
                      step.priority === 'medium' ? "bg-amber-100 text-amber-600" : 
                      "bg-blue-100 text-blue-600"
                    )}>
                      {step.priority}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">{step.title}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* SWOT Analysis */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Analyse SWOT</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} /> Forces
                </h4>
                <ul className="space-y-2">
                  {insights.swot.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-emerald-700 flex gap-2">
                      <span className="shrink-0">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} /> Faiblesses
                </h4>
                <ul className="space-y-2">
                  {insights.swot.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm text-red-700 flex gap-2">
                      <span className="shrink-0">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} /> Opportunités
                </h4>
                <ul className="space-y-2">
                  {insights.swot.opportunities.map((o, i) => (
                    <li key={i} className="text-sm text-blue-700 flex gap-2">
                      <span className="shrink-0">•</span> {o}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} /> Menaces
                </h4>
                <ul className="space-y-2">
                  {insights.swot.threats.map((t, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="shrink-0">•</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Marketing & Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Idées Marketing</h3>
              </div>
              <div className="space-y-4">
                {insights.marketingIdeas.map((idea, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-pink-500 font-bold text-xs">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{idea}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                  <Rocket size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Feuille de Route</h3>
              </div>
              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {insights.roadmap.map((step, i) => (
                  <div key={i} className="relative pl-10">
                    <div className="absolute left-0 top-1.5 w-8 h-8 bg-white border-2 border-indigo-500 rounded-full flex items-center justify-center z-10">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Strategy */}
          <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-200 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Package size={28} />
                  Stratégie d'Inventaire
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {insights.inventoryStrategy.map((strategy, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <p className="text-sm leading-relaxed">{strategy}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/20">
                <Rocket size={80} className="text-white animate-bounce" />
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full" />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-20 text-center">
          <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <BrainCircuit size={48} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Prêt pour l'analyse ?</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Cliquez sur le bouton ci-dessus pour générer une analyse complète de vos performances et obtenir des conseils stratégiques personnalisés.
          </p>
          <button 
            onClick={fetchInsights}
            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 mx-auto"
          >
            <Sparkles size={20} />
            Lancer l'analyse intelligente
          </button>
        </div>
      )}

      <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 text-center">
        <p className="text-slate-500 text-sm italic">
          Note : Les analyses sont générées par une intelligence artificielle basée sur vos données réelles. Elles doivent être utilisées comme des outils d'aide à la décision.
        </p>
      </div>
    </div>
  );
}

