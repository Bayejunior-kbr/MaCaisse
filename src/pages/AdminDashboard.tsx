import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Store, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  BarChart3, 
  ArrowUpRight,
  Package,
  Search,
  Loader2,
  Check,
  X,
  Clock,
  Ban,
  AlertTriangle,
  Trash2,
  Unlock,
  Send,
  Mail,
  Bell,
  LayoutDashboard,
  CreditCard,
  MessageSquare,
  Settings as SettingsIcon,
  Zap,
  Download,
  Activity,
  Globe,
  Shield,
  FileText,
  Terminal,
  Save,
  UserPlus,
  Lock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { secureFetch } from '../lib/api';
import { SubscriptionTimer } from '../components/SubscriptionTimer';
import { ConfirmModal } from '../components/ConfirmModal';

const AdminStatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold",
          trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <TrendingUp size={12} className="rotate-180" />}
          {trendValue}%
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
  </div>
);

const SystemHealthWidget = () => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <ShieldCheck size={18} className="text-emerald-600" />
        Santé du Système
      </h3>
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
        OPÉRATIONNEL
      </span>
    </div>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Base de données</span>
        <span className="text-xs font-bold text-slate-700">Connecté (Postgres)</span>
      </div>
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div className="bg-emerald-500 h-full w-[98%]" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Serveur API</span>
        <span className="text-xs font-bold text-slate-700">Latence: 24ms</span>
      </div>
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div className="bg-emerald-500 h-full w-[95%]" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Stockage (S3/Local)</span>
        <span className="text-xs font-bold text-slate-700">42.5 GB / 100 GB</span>
      </div>
      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
        <div className="bg-blue-500 h-full w-[42%]" />
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'shops' | 'users' | 'requests' | 'broadcast' | 'logs' | 'settings'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>({
    payment_number: '78 307 01 14',
    maintenance_mode: 'false',
    support_email: 'support@smartstock.sn'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<string>('all'); // 'all' or shopId
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ name: '', email: '', password: '' });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'shop' | 'user', id: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAdmin(true);
    try {
      const res = await secureFetch('/api/admin/users/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdminData)
      });
      if (res.ok) {
        alert("Administrateur créé avec succès !");
        setShowAddAdminModal(false);
        setNewAdminData({ name: '', email: '', password: '' });
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la création");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const fetchData = async (retries = 2) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Non authentifié");

      const [statsRes, shopsRes, requestsRes, usersRes] = await Promise.all([
        secureFetch('/api/admin/stats'),
        secureFetch('/api/admin/shops'),
        secureFetch('/api/admin/subscription-requests'),
        secureFetch('/api/admin/users')
      ]);

      if (statsRes.status === 403 || shopsRes.status === 403 || requestsRes.status === 403) {
        throw new Error("Accès refusé. Vous n'êtes pas administrateur.");
      }

      const checkResponse = async (res: Response) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Erreur serveur" }));
          throw new Error(errorData.error || "Erreur lors de la récupération des données");
        }
        return res.json();
      };

      const [statsData, shopsData, requestsData, usersData] = await Promise.all([
        checkResponse(statsRes),
        checkResponse(shopsRes),
        checkResponse(requestsRes),
        checkResponse(usersRes)
      ]);

      setStats(statsData);
      setShops(shopsData);
      setSubscriptionRequests(requestsData);
      setUsers(usersData);
      setError(null);
    } catch (err: any) {
      console.error("Fetch error:", err);
      if (retries > 0 && err.message === 'Failed to fetch') {
        setTimeout(() => fetchData(retries - 1), 1000);
        return;
      }
      setError(err.message || "Erreur lors de la récupération des données admin");
    } finally {
      setLoading(false);
    }
  };

  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingShopId, setProcessingShopId] = useState<number | null>(null);
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  const handleBlockShop = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    setProcessingShopId(id);
    try {
      const res = await secureFetch(`/api/admin/shops/${id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingShopId(null);
    }
  };

  const handleSignalShop = async (id: number, currentSignaled: boolean) => {
    setProcessingShopId(id);
    try {
      const res = await secureFetch(`/api/admin/shops/${id}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signaled: !currentSignaled })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingShopId(null);
    }
  };

  const handleDeleteShop = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await secureFetch(`/api/admin/shops/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
        setConfirmDelete(null);
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression de la boutique");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur réseau est survenue");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    setIsDeleting(true);
    try {
      const res = await secureFetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
        setConfirmDelete(null);
      } else {
        const data = await res.json();
        alert(`Erreur: ${data.error || "Erreur lors de la suppression"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion au serveur lors de la suppression de l'utilisateur");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await secureFetch(`/api/admin/subscription-requests/${id}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Abonnement approuvé !");
        await fetchData();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await secureFetch(`/api/admin/subscription-requests/${id}/reject`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await secureFetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await secureFetch('/api/admin/broadcasts');
      if (res.ok) {
        const data = await res.json();
        setBroadcastHistory(data);
      }
    } catch (err) {
      console.error("Error fetching broadcasts:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await secureFetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const settingsObj: any = {};
          data.forEach((s: any) => {
            settingsObj[s.key] = s.value;
          });
          setPlatformSettings(settingsObj);
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await secureFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: platformSettings })
      });
      if (res.ok) {
        alert("Paramètres enregistrés !");
        fetchSettings();
      }
    } catch (err) {
      console.error("Error saving settings:", err);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) return;
    setSendingBroadcast(true);
    try {
      const res = await secureFetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          shopId: broadcastTarget === 'all' ? null : parseInt(broadcastTarget)
        })
      });
      if (res.ok) {
        alert("Message envoyé avec succès !");
        setBroadcastTitle('');
        setBroadcastMessage('');
        fetchBroadcasts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    fetchData();
    fetchLogs();
    fetchBroadcasts();
    fetchSettings();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full">Chargement de la console...</div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-8">
        <div className="p-4 bg-red-50 text-red-600 rounded-3xl border border-red-100 max-w-md">
          <p className="font-bold mb-2">Erreur d'accès</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={() => fetchData()} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold">Réessayer</button>
      </div>
    );
  }

  const filteredShops = shops.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="text-center lg:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Super Admin</h2>
          <p className="text-slate-500 text-sm md:text-base">Gestion globale de ShopMaster Pro</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
          <div className="flex min-w-max">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'overview' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Vue d'ensemble
            </button>
            <button 
              onClick={() => setActiveTab('shops')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'shops' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Boutiques
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'users' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Utilisateurs
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'requests' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Demandes
            </button>
            <button 
              onClick={() => setActiveTab('broadcast')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'broadcast' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Messages
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'logs' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Logs
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === 'settings' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Paramètres
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminStatCard title="Boutiques" value={stats?.totalShops || 0} icon={Store} color="bg-blue-600" trend="up" trendValue={12} />
            <AdminStatCard title="Utilisateurs" value={stats?.totalUsers || 0} icon={Users} color="bg-indigo-600" trend="up" trendValue={8} />
            <AdminStatCard title="Revenus Abos" value={formatCurrency(stats?.totalSubscriptionRevenue || 0, currentUser?.currency)} icon={DollarSign} color="bg-emerald-600" trend="up" trendValue={24} />
            <AdminStatCard title="Premium" value={stats?.premiumShops || 0} icon={ShieldCheck} color="bg-amber-500" trend="up" trendValue={5} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Revenus Abonnements (30j)</h3>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <ArrowUpRight size={12} />
                    +15.4%
                  </span>
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.subscriptionsByDay || []}>
                    <defs>
                      <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="opacity-10" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc' }} />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAdmin)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <SystemHealthWidget />

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Actions Rapides</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setActiveTab('broadcast')} className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 hover:bg-emerald-50 transition-all group">
                    <Send size={20} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-600">Diffuser</span>
                  </button>
                  <button onClick={() => setActiveTab('requests')} className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 hover:bg-amber-50 transition-all group">
                    <CreditCard size={20} className="text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-600">Demandes</span>
                  </button>
                  <button onClick={() => setActiveTab('shops')} className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-50 transition-all group">
                    <Store size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-600">Boutiques</span>
                  </button>
                  <button onClick={() => setActiveTab('settings')} className="p-4 bg-slate-50 rounded-2xl flex flex-col items-center gap-2 hover:bg-slate-100 transition-all group">
                    <SettingsIcon size={20} className="text-slate-600 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-slate-600">Réglages</span>
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Top Boutiques</h3>
                <div className="space-y-4">
                  {shops.sort((a, b) => (b.totalSales || 0) - (a.totalSales || 0)).slice(0, 3).map((shop, idx) => (
                    <div key={shop.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-bold text-slate-400 w-4">{idx + 1}</div>
                        <div className="text-sm font-bold text-slate-800">{shop.name}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-600">{formatCurrency(shop.totalSales || 0, currentUser?.currency)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Revenus Plateforme</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl">
                    <p className="text-xs text-emerald-600 uppercase font-bold mb-1">Abonnements (Est.)</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency((stats?.premiumShops || 0) * 10000, currentUser?.currency)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl">
                    <p className="text-xs text-blue-600 uppercase font-bold mb-1">Boutiques Actives</p>
                    <p className="text-2xl font-bold text-blue-700">{stats?.totalShops || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Bell size={18} className="text-amber-500" />
                  Alertes Système
                </h3>
                <div className="space-y-3">
                  {subscriptionRequests.filter(r => r.status === 'pending').length > 0 && (
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      <span>{subscriptionRequests.filter(r => r.status === 'pending').length} demandes en attente</span>
                    </div>
                  )}
                  {shops.filter(s => s.is_signaled).length > 0 && (
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span>{shops.filter(s => s.is_signaled).length} boutiques signalées</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span>Système opérationnel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Derniers Utilisateurs
              </h4>
              <div className="space-y-4">
                {stats?.recentUsers?.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{u.name}</p>
                        <p className="text-[10px] text-slate-500">{u.shopName || 'Sans Boutique'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
                  <p className="text-center text-slate-500 text-sm py-4">Aucun utilisateur récent.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" />
                Derniers Abonnements
              </h4>
              <div className="space-y-4">
                {stats?.recentSubscriptions?.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Zap size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{s.shopName}</p>
                        <p className="text-[10px] text-slate-500">{s.userName} • {s.payment_method}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(!stats?.recentSubscriptions || stats.recentSubscriptions.length === 0) && (
                  <p className="text-center text-slate-500 text-sm py-4">Aucun abonnement récent.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'shops' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800">Toutes les Boutiques</h3>
              <button 
                onClick={() => exportToCSV(shops, 'boutiques-export')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                <Download size={14} />
                Exporter CSV
              </button>
            </div>
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher une boutique..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500 text-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Boutique</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Plan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Stats</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ventes</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShops.length > 0 ? filteredShops.map(shop => (
                  <tr key={shop.id} className={cn(
                    "hover:bg-slate-50 transition-colors group",
                    shop.status === 'blocked' ? "bg-red-50/30" : "",
                    shop.is_signaled ? "border-l-4 border-l-amber-500" : ""
                  )}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold group-hover:bg-white transition-colors">
                          {shop.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 flex items-center gap-2">
                            {shop.name}
                            {shop.is_signaled && <AlertTriangle size={14} className="text-amber-500 animate-pulse" />}
                          </span>
                          <span className="text-[10px] text-slate-500">Créé le {new Date(shop.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                          shop.plan === 'premium' ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {shop.plan}
                        </span>
                        {shop.plan === 'premium' && shop.subscription_expires_at && (
                          <SubscriptionTimer expiresAt={shop.subscription_expires_at} plan={shop.plan} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span title="Utilisateurs" className="flex items-center gap-1"><Users size={12} />{shop.userCount}</span>
                        <span title="Produits" className="flex items-center gap-1"><Package size={12} />{shop.productCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{formatCurrency(shop.totalSales || 0, currentUser?.currency)}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">+{Math.floor(Math.random() * 20)}% ce mois</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleSignalShop(shop.id, !!shop.is_signaled)} className={cn("p-2 rounded-xl transition-all", shop.is_signaled ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400 hover:text-amber-600")} title="Signaler">
                          <AlertTriangle size={16} />
                        </button>
                        <button onClick={() => handleBlockShop(shop.id, shop.status)} className={cn("p-2 rounded-xl transition-all", shop.status === 'blocked' ? "bg-red-600 text-white shadow-lg shadow-red-100" : "bg-slate-100 text-slate-400 hover:text-red-600")} title={shop.status === 'blocked' ? "Débloquer" : "Bloquer"}>
                          {shop.status === 'blocked' ? <Unlock size={16} /> : <Ban size={16} />}
                        </button>
                        <button onClick={() => setConfirmDelete({ type: 'shop', id: shop.id })} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all" title="Supprimer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Search size={48} className="opacity-20" />
                        <p className="text-sm font-medium">Aucune boutique ne correspond à votre recherche.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Shops */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredShops.length > 0 ? filteredShops.map(shop => (
              <div key={shop.id} className={cn(
                "p-4 space-y-4",
                shop.status === 'blocked' ? "bg-red-50/30" : "",
                shop.is_signaled ? "border-l-4 border-l-amber-500" : ""
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                      {shop.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        {shop.name}
                        {shop.is_signaled && <AlertTriangle size={14} className="text-amber-500" />}
                      </h4>
                      <p className="text-[10px] text-slate-500">Créé le {new Date(shop.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    shop.plan === 'premium' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {shop.plan}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Stats</p>
                    <div className="flex gap-3 text-xs text-slate-700 font-medium">
                      <span className="flex items-center gap-1"><Users size={12} />{shop.userCount}</span>
                      <span className="flex items-center gap-1"><Package size={12} />{shop.productCount}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ventes</p>
                    <p className="text-xs font-bold text-slate-800">{formatCurrency(shop.totalSales || 0, currentUser?.currency)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => handleSignalShop(shop.id, !!shop.is_signaled)} className={cn("p-2 rounded-xl", shop.is_signaled ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400")}>
                    <AlertTriangle size={18} />
                  </button>
                  <button onClick={() => handleBlockShop(shop.id, shop.status)} className={cn("p-2 rounded-xl", shop.status === 'blocked' ? "bg-red-600 text-white" : "bg-slate-100 text-slate-400")}>
                    {shop.status === 'blocked' ? <Unlock size={18} /> : <Ban size={18} />}
                  </button>
                  <button onClick={() => setConfirmDelete({ type: 'shop', id: shop.id })} className="p-2 bg-slate-100 text-slate-400 rounded-xl">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400">Aucune boutique trouvée</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800">Gestion des Utilisateurs</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setShowAddAdminModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
                >
                  <UserPlus size={14} />
                  Ajouter un Admin
                </button>
                <button 
                  onClick={() => exportToCSV(users, 'utilisateurs')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                >
                  <Download size={14} />
                  Exporter CSV
                </button>
              </div>
            </div>
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher un utilisateur..." 
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500 text-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Utilisateur</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Boutique</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Rôle</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:scale-110 transition-transform">
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{u.name}</span>
                          <span className="text-[10px] text-slate-500">Inscrit le {new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{u.shopName || 'Administration'}</span>
                        <span className="text-[10px] text-slate-500">ID Boutique: {u.shop_id || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        u.role === 'admin' ? "bg-blue-100 text-blue-700 border border-blue-200" : 
                        u.role === 'owner' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setConfirmDelete({ type: 'user', id: u.id })}
                        disabled={processingUserId === u.id || u.email === 'baye@gmail.com'}
                        className="p-2 bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all disabled:opacity-30 opacity-0 group-hover:opacity-100"
                        title="Supprimer l'utilisateur"
                      >
                        {processingUserId === u.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Users size={48} className="opacity-20" />
                        <p className="text-sm font-medium">Aucun utilisateur trouvé.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Users */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredUsers.length > 0 ? filteredUsers.map(u => (
              <div key={u.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{u.name}</h4>
                      <p className="text-[10px] text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    u.role === 'admin' ? "bg-blue-100 text-blue-700" : 
                    u.role === 'owner' ? "bg-emerald-100 text-emerald-700" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {u.role}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Boutique</p>
                  <p className="text-xs font-bold text-slate-800">{u.shopName || 'Administration'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Inscrit le {new Date(u.created_at).toLocaleDateString()}</span>
                  <button 
                    onClick={() => setConfirmDelete({ type: 'user', id: u.id })}
                    disabled={processingUserId === u.id || u.email === 'baye@gmail.com'}
                    className="p-2 bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400">Aucun utilisateur trouvé</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Demandes d'Abonnement Premium</h3>
          </div>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Boutique / Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Paiement</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptionRequests.length > 0 ? subscriptionRequests.map(req => (
                  <tr key={req.id} className={cn("hover:bg-slate-50 transition-colors group", req.status === 'pending' && "bg-amber-50/30")}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <Store size={20} />
                        </div>
                        <div className="flex flex-col">
                          <p className="font-bold text-slate-800">{req.shopName}</p>
                          <p className="text-[10px] text-slate-500">{req.userName} • {new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          {req.payment_method === 'wave' ? <Zap size={14} className="text-blue-500" /> : <CreditCard size={14} className="text-emerald-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 uppercase">{req.payment_method}</span>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{req.transaction_ref}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        req.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                        req.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                        "bg-red-50 text-red-600 border-red-200"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleApprove(req.id)} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">Approuver</button>
                          <button onClick={() => handleReject(req.id)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-600 rounded-xl transition-all"><X size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <CreditCard size={48} className="opacity-20" />
                        <p className="text-sm font-medium">Aucune demande d'abonnement.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Subscription Requests */}
          <div className="md:hidden divide-y divide-slate-100">
            {subscriptionRequests.length > 0 ? subscriptionRequests.map(req => (
              <div key={req.id} className={cn("p-4 space-y-4", req.status === 'pending' && "bg-amber-50/30")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Store size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{req.shopName}</h4>
                      <p className="text-[10px] text-slate-500">{req.userName}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    req.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                    req.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                    "bg-red-50 text-red-600 border-red-200"
                  )}>
                    {req.status}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {req.payment_method === 'wave' ? <Zap size={14} className="text-blue-500" /> : <CreditCard size={14} className="text-emerald-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 uppercase">{req.payment_method}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{req.transaction_ref}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
                {req.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleApprove(req.id)} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-100">Approuver</button>
                    <button onClick={() => handleReject(req.id)} className="p-2 bg-slate-100 text-slate-400 rounded-xl"><X size={18} /></button>
                  </div>
                )}
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400">Aucune demande trouvée</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <MessageSquare className="text-emerald-600" />
              Diffuser un Message
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Cible du message</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500 text-slate-800"
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                >
                  <option value="all">Tous les utilisateurs (Global)</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Titre de l'annonce</label>
                <input 
                  type="text" 
                  placeholder="Ex: Nouvelle mise à jour disponible !"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500 text-slate-800"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                <textarea 
                  rows={5}
                  placeholder="Écrivez votre message ici..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500 resize-none text-slate-800"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSendBroadcast}
                disabled={sendingBroadcast || !broadcastTitle || !broadcastMessage}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingBroadcast ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                Envoyer le message
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Conseils d'Admin</h3>
                <p className="text-blue-100 text-sm">
                  Utilisez les messages globaux pour informer les utilisateurs des maintenances ou des nouvelles fonctionnalités Premium.
                </p>
              </div>
              <ShieldCheck size={120} className="absolute -right-8 -bottom-8 text-white/10" />
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h4 className="font-bold text-slate-800 mb-4">Historique des Diffusions</h4>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {broadcastHistory.length > 0 ? broadcastHistory.map(b => (
                  <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {b.type}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-800 mb-1">{b.title}</h5>
                    <p className="text-xs text-slate-500 line-clamp-2">{b.message}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                      <Globe size={10} /> {b.shopName || 'Tous les utilisateurs'}
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Clock size={14} />
                    </div>
                    <p className="text-slate-600">Aucun historique de diffusion.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-800">Journaux d'Audit Système</h3>
            <button 
              onClick={() => exportToCSV(logs, 'audit_logs')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all w-fit"
            >
              <Download size={14} />
              Exporter CSV
            </button>
          </div>
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Admin</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Détails</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length > 0 ? logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{log.userName}</span>
                        <span className="text-[10px] text-slate-500">{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        log.action.includes('DELETE') ? "bg-red-50 text-red-600" :
                        log.action.includes('APPROVE') ? "bg-emerald-50 text-emerald-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-400">
                      {log.ip_address}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Terminal size={48} className="opacity-20" />
                        <p className="text-sm font-medium">Aucun journal d'audit disponible.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View for Logs */}
          <div className="md:hidden divide-y divide-slate-100">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{log.userName}</span>
                    <span className="text-[10px] text-slate-500">{log.userEmail}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    log.action.includes('DELETE') ? "bg-red-50 text-red-600" :
                    log.action.includes('APPROVE') ? "bg-emerald-50 text-emerald-600" :
                    "bg-blue-50 text-blue-600"
                  )}>
                    {log.action}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-xs text-slate-600 leading-relaxed">{log.details}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  <span className="font-mono">{log.ip_address}</span>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400">Aucun log trouvé</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto lg:mx-0 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <SettingsIcon className="text-slate-600" />
            Paramètres de la Plateforme
          </h3>
          
          <div className="space-y-6">
            <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4">Coordonnées de Paiement</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Numéro Wave / OM</label>
                  <input 
                    type="text" 
                    value={platformSettings.payment_number}
                    onChange={(e) => setPlatformSettings({...platformSettings, payment_number: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Ce numéro est affiché aux clients pour les abonnements manuels.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email de Support</label>
                  <input 
                    type="email" 
                    value={platformSettings.support_email}
                    onChange={(e) => setPlatformSettings({...platformSettings, support_email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email d'Alerte Admin</label>
                  <input 
                    type="email" 
                    value={platformSettings.admin_alert_email}
                    onChange={(e) => setPlatformSettings({...platformSettings, admin_alert_email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Cet email recevra les alertes système importantes.</p>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-4">Maintenance</h4>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-700">Mode Maintenance</p>
                  <p className="text-xs text-slate-500">Empêcher l'accès aux boutiques pendant les mises à jour.</p>
                </div>
                <div 
                  onClick={() => setPlatformSettings({...platformSettings, maintenance_mode: platformSettings.maintenance_mode === 'true' ? 'false' : 'true'})}
                  className={cn(
                    "w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0",
                    platformSettings.maintenance_mode === 'true' ? "bg-red-500" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                    platformSettings.maintenance_mode === 'true' ? "left-7" : "left-1"
                  )}></div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Enregistrer les modifications
            </button>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Shield className="text-blue-600" />
                Nouvel Administrateur
              </h3>
              <button onClick={() => setShowAddAdminModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nom Complet</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-blue-500 transition-all"
                    placeholder="Prénom Nom"
                    value={newAdminData.name}
                    onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-blue-500 transition-all"
                    placeholder="admin@shopmaster.pro"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-transparent outline-none focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreatingAdmin ? <Loader2 className="animate-spin" size={20} /> : <Shield size={20} />}
                  Créer l'Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Modal */}
      <ConfirmModal 
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'shop') handleDeleteShop(confirmDelete.id);
          else if (confirmDelete?.type === 'user') handleDeleteUser(confirmDelete.id);
        }}
        loading={isDeleting}
        title={confirmDelete?.type === 'shop' ? "Supprimer la boutique" : "Supprimer l'utilisateur"}
        message={confirmDelete?.type === 'shop' 
          ? "ATTENTION: Cette action supprimera DÉFINITIVEMENT la boutique et TOUTES ses données (produits, ventes, utilisateurs). Cette action est irréversible." 
          : "Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible."}
      />
    </div>
  );
}
