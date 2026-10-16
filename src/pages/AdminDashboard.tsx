import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Globe,
  LayoutDashboard,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  Terminal,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn, formatCurrency } from '../lib/utils';
import { secureFetch } from '../lib/api';
import { SubscriptionTimer } from '../components/SubscriptionTimer';
import { ConfirmModal } from '../components/ConfirmModal';

type AdminTab =
  | 'overview'
  | 'shops'
  | 'users'
  | 'requests'
  | 'broadcast'
  | 'logs'
  | 'settings';

const panelClass =
  'rounded-2xl border border-slate-200/80 bg-white shadow-sm';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#044598] focus:ring-4 focus:ring-blue-100';

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#044598]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ElementType;
  tone?: 'blue' | 'amber' | 'violet' | 'slate';
}) {
  const tones = {
    blue: 'bg-blue-50 text-[#044598]',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={`${panelClass} p-4 sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{detail}</p>
        </div>
        <div className={cn('rounded-xl p-3', tones[tone])}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-400">
        <Icon size={24} />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>({
    payment_number: '78 307 01 14',
    maintenance_mode: 'false',
    support_email: 'macaisse80@gmail.com',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'shop' | 'user';
    id: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingShopId, setProcessingShopId] = useState<number | null>(null);

  const fetchData = async (retries = 2) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Non authentifié');

      const [statsRes, shopsRes, requestsRes, usersRes] = await Promise.all([
        secureFetch('/api/admin/stats'),
        secureFetch('/api/admin/shops'),
        secureFetch('/api/admin/subscription-requests'),
        secureFetch('/api/admin/users'),
      ]);

      if (
        statsRes.status === 403 ||
        shopsRes.status === 403 ||
        requestsRes.status === 403 ||
        usersRes.status === 403
      ) {
        throw new Error("Accès refusé. Vous n'êtes pas administrateur.");
      }

      const readResponse = async (response: Response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({
            error: 'Erreur serveur',
          }));
          throw new Error(data.error || 'Erreur lors de la récupération des données');
        }
        return response.json();
      };

      const [statsData, shopsData, requestsData, usersData] =
        await Promise.all([
          readResponse(statsRes),
          readResponse(shopsRes),
          readResponse(requestsRes),
          readResponse(usersRes),
        ]);

      setStats(statsData);
      setShops(shopsData);
      setSubscriptionRequests(requestsData);
      setUsers(usersData);
      setError(null);
    } catch (err: any) {
      console.error('Fetch error:', err);

      if (retries > 0 && err?.message === 'Failed to fetch') {
        window.setTimeout(() => void fetchData(retries - 1), 1000);
        return;
      }

      setError(err?.message || 'Erreur lors de la récupération des données admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await secureFetch('/api/admin/logs');
      if (response.ok) setLogs(await response.json());
    } catch (err) {
      console.error('Erreur lors du chargement des journaux:', err);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const response = await secureFetch('/api/admin/broadcasts');
      if (response.ok) setBroadcastHistory(await response.json());
    } catch (err) {
      console.error('Erreur lors du chargement des messages:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await secureFetch('/api/admin/settings');
      if (!response.ok) return;

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const settings: Record<string, string> = {};
        data.forEach((item: any) => {
          settings[item.key] = item.value;
        });
        setPlatformSettings((previous: any) => ({
          ...previous,
          ...settings,
        }));
      }
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres:', err);
    }
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setCurrentUser(JSON.parse(storedUser));
    } catch (err) {
      console.error('Utilisateur local invalide:', err);
    }

    void fetchData();
    void fetchLogs();
    void fetchBroadcasts();
    void fetchSettings();
  }, []);

  const handleCreateAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreatingAdmin(true);

    try {
      const response = await secureFetch('/api/admin/users/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdminData),
      });

      if (response.ok) {
        alert('Administrateur créé avec succès !');
        setShowAddAdminModal(false);
        setNewAdminData({ name: '', email: '', password: '' });
        await fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la création');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleBlockShop = async (id: number, currentStatus: string) => {
    const status = currentStatus === 'blocked' ? 'active' : 'blocked';
    setProcessingShopId(id);

    try {
      const response = await secureFetch(`/api/admin/shops/${id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingShopId(null);
    }
  };

  const handleSignalShop = async (id: number, isSignaled: boolean) => {
    setProcessingShopId(id);

    try {
      const response = await secureFetch(`/api/admin/shops/${id}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signaled: !isSignaled }),
      });
      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingShopId(null);
    }
  };

  const handleDeleteShop = async (id: number) => {
    setIsDeleting(true);

    try {
      const response = await secureFetch(`/api/admin/shops/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
        setConfirmDelete(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression de la boutique');
      }
    } catch (err) {
      console.error(err);
      alert('Une erreur réseau est survenue');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    setIsDeleting(true);

    try {
      const response = await secureFetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
        setConfirmDelete(null);
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la suppression de l'utilisateur");
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
      const response = await secureFetch(
        `/api/admin/subscription-requests/${id}/approve`,
        { method: 'POST' },
      );

      if (response.ok) {
        alert('Abonnement approuvé !');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);

    try {
      const response = await secureFetch(
        `/api/admin/subscription-requests/${id}/reject`,
        { method: 'POST' },
      );

      if (response.ok) await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await secureFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: platformSettings }),
      });

      if (response.ok) {
        alert('Paramètres enregistrés !');
        void fetchSettings();
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des paramètres:', err);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data?.length) {
      alert('Aucune donnée à exporter.');
      return;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map((item) =>
      headers
        .map((header) => {
          const value = item[header];
          const escaped =
            typeof value === 'string'
              ? `"${value.replace(/"/g, '""')}"`
              : String(value ?? '');
          return escaped;
        })
        .join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${filename}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setSendingBroadcast(true);

    try {
      const response = await secureFetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          shopId: broadcastTarget === 'all' ? null : Number(broadcastTarget),
        }),
      });

      if (response.ok) {
        alert('Message envoyé avec succès !');
        setBroadcastTitle('');
        setBroadcastMessage('');
        void fetchBroadcasts();
      } else {
        const data = await response.json();
        alert(data.error || "Impossible d'envoyer le message.");
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau lors de l’envoi du message.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const filteredShops = shops.filter((shop) =>
    shop.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const pendingCount = subscriptionRequests.filter(
    (request) => request.status === 'pending',
  ).length;
  const flaggedCount = shops.filter((shop) => shop.is_signaled).length;

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue générale', icon: LayoutDashboard },
    { id: 'shops', label: 'Boutiques', icon: Store },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'requests', label: 'Abonnements', icon: CreditCard },
    { id: 'broadcast', label: 'Messages', icon: MessageSquare },
    { id: 'logs', label: 'Journal', icon: Terminal },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-4 text-[#044598]">
          <Loader2 size={26} className="animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          Chargement de la console…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-red-600">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Accès indisponible</h2>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            void fetchData();
          }}
          className="mt-5 rounded-xl bg-[#044598] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#033875]"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Boutiques"
          value={stats?.totalShops || 0}
          detail="Boutiques enregistrées"
          icon={Store}
          tone="blue"
        />
        <StatCard
          label="Utilisateurs"
          value={stats?.totalUsers || 0}
          detail="Comptes sur la plateforme"
          icon={Users}
          tone="violet"
        />
        <StatCard
          label="Revenus abonnements"
          value={formatCurrency(
            stats?.totalSubscriptionRevenue || 0,
            currentUser?.currency,
          )}
          detail="Revenus cumulés"
          icon={CreditCard}
          tone="amber"
        />
        <StatCard
          label="Boutiques Premium"
          value={stats?.premiumShops || 0}
          detail="Abonnements Premium actifs"
          icon={ShieldCheck}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <section className={`${panelClass} p-4 sm:p-5`}>
          <SectionHeading
            eyebrow="Activité"
            title="Revenus des abonnements"
            description="Évolution selon les données disponibles."
          />
          <div className="h-64 min-h-[240px] w-full">
            {stats?.subscriptionsByDay?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.subscriptionsByDay}>
                  <defs>
                    <linearGradient
                      id="macaisseAdminRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#044598" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#044598" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#08264d',
                      border: 'none',
                      borderRadius: 12,
                      color: '#fff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#044598"
                    strokeWidth={3}
                    fill="url(#macaisseAdminRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Activity}
                title="Pas encore de données à afficher"
                description="Le graphique apparaîtra dès que des revenus d’abonnement seront enregistrés."
              />
            )}
          </div>
        </section>

        <section className={`${panelClass} p-4 sm:p-5`}>
          <SectionHeading
            eyebrow="À traiter"
            title="État de la plateforme"
            description="Éléments qui peuvent demander votre attention."
          />

          <div className="space-y-3">
            <button
              onClick={() => setActiveTab('requests')}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-amber-200 hover:bg-amber-50"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <Clock size={17} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    Demandes en attente
                  </span>
                  <span className="text-xs text-slate-500">
                    Abonnements à vérifier
                  </span>
                </span>
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-sm font-extrabold text-amber-700">
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shops')}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-red-200 hover:bg-red-50"
            >
              <span className="flex items-center gap-3">
                <span className="rounded-lg bg-red-100 p-2 text-red-700">
                  <AlertTriangle size={17} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">
                    Boutiques signalées
                  </span>
                  <span className="text-xs text-slate-500">
                    À consulter dans la liste
                  </span>
                </span>
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-sm font-extrabold text-red-700">
                {flaggedCount}
              </span>
            </button>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-[#044598]">
                <ShieldCheck size={17} />
                Vue d’administration
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Les chiffres et listes affichés proviennent des données chargées
                depuis la plateforme.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('broadcast')}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#044598] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#033875]"
            >
              <Send size={15} />
              Diffuser
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Settings size={15} />
              Réglages
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${panelClass} p-4 sm:p-5`}>
          <SectionHeading title="Derniers utilisateurs" />
          <div className="space-y-2">
            {stats?.recentUsers?.length ? (
              stats.recentUsers.slice(0, 5).map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-[#044598]">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {user.name || 'Utilisateur'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.shopName || 'Sans boutique'}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('fr-FR')
                      : ''}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState icon={Users} title="Aucun utilisateur récent" />
            )}
          </div>
        </section>

        <section className={`${panelClass} p-4 sm:p-5`}>
          <SectionHeading title="Derniers abonnements" />
          <div className="space-y-2">
            {stats?.recentSubscriptions?.length ? (
              stats.recentSubscriptions.slice(0, 5).map((subscription: any) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                      <Zap size={17} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {subscription.shopName || 'Boutique'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {subscription.userName || 'Utilisateur'}
                        {subscription.payment_method
                          ? ` · ${subscription.payment_method}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {subscription.created_at
                      ? new Date(subscription.created_at).toLocaleDateString('fr-FR')
                      : ''}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState icon={CreditCard} title="Aucun abonnement récent" />
            )}
          </div>
        </section>
      </div>
    </div>
  );

  const renderShops = () => (
    <div>
      <SectionHeading
        eyebrow="Comptes boutiques"
        title="Boutiques"
        description={`${filteredShops.length} boutique(s) affichée(s).`}
        action={
          <button
            onClick={() => exportToCSV(shops, 'boutiques-export')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={15} />
            Exporter CSV
          </button>
        }
      />

      <label className="relative mb-4 block max-w-md">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className={`${inputClass} pl-10`}
          placeholder="Rechercher une boutique…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      {filteredShops.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredShops.map((shop) => (
            <motion.article
              key={shop.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                `${panelClass} p-4`,
                shop.status === 'blocked' && 'border-red-200 bg-red-50/40',
                shop.is_signaled && 'border-amber-200',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-extrabold text-[#044598]">
                    {shop.name?.charAt(0)?.toUpperCase() || <Store size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">
                      {shop.name || 'Boutique sans nom'}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Créée le{' '}
                      {shop.created_at
                        ? new Date(shop.created_at).toLocaleDateString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                </div>

                {shop.is_signaled && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                    <AlertTriangle size={12} />
                    Signalée
                  </span>
                )}
              </div>

              <div className="my-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Formule
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-800">
                    {shop.plan === 'premium' ? 'Premium' : 'Gratuite'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Membres
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Users size={13} />
                    {shop.userCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Produits
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Package size={13} />
                    {shop.productCount ?? 0}
                  </p>
                </div>
              </div>

              {shop.plan === 'premium' && shop.subscription_expires_at && (
                <div className="mb-3">
                  <SubscriptionTimer
                    expiresAt={shop.subscription_expires_at}
                    plan={shop.plan}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Ventes
                  </p>
                  <p className="text-sm font-extrabold text-[#044598]">
                    {formatCurrency(shop.totalSales || 0, currentUser?.currency)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => void handleSignalShop(shop.id, !!shop.is_signaled)}
                    disabled={processingShopId === shop.id}
                    title={shop.is_signaled ? 'Retirer le signalement' : 'Signaler'}
                    className={cn(
                      'rounded-lg p-2 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50',
                      shop.is_signaled
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {processingShopId === shop.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <AlertTriangle size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => void handleBlockShop(shop.id, shop.status)}
                    disabled={processingShopId === shop.id}
                    title={shop.status === 'blocked' ? 'Débloquer' : 'Bloquer'}
                    className={cn(
                      'rounded-lg p-2 transition disabled:opacity-50',
                      shop.status === 'blocked'
                        ? 'bg-blue-50 text-[#044598] hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600',
                    )}
                  >
                    {shop.status === 'blocked' ? (
                      <Unlock size={16} />
                    ) : (
                      <Ban size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: 'shop', id: shop.id })}
                    title="Supprimer la boutique"
                    className="rounded-lg bg-slate-100 p-2 text-slate-500 transition hover:bg-red-600 hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {shop.status === 'blocked' && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  Cette boutique est bloquée.
                </p>
              )}
            </motion.article>
          ))}
        </div>
      ) : (
        <div className={panelClass}>
          <EmptyState
            icon={Store}
            title="Aucune boutique trouvée"
            description="Essaie un autre nom dans la recherche."
          />
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div>
      <SectionHeading
        eyebrow="Comptes de la plateforme"
        title="Utilisateurs"
        description={`${filteredUsers.length} utilisateur(s) affiché(s).`}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#044598] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#033875]"
            >
              <UserPlus size={15} />
              Ajouter un admin
            </button>
            <button
              onClick={() => exportToCSV(users, 'utilisateurs')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={15} />
              Exporter CSV
            </button>
          </div>
        }
      />

      <label className="relative mb-4 block max-w-md">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className={`${inputClass} pl-10`}
          placeholder="Rechercher un nom ou un email…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      {filteredUsers.length ? (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filteredUsers.map((user) => {
            const protectedAccount = [
              'baye@gmail.com',
              'kobarbayedame6@gmail.com',
            ].includes(user.email);

            return (
              <motion.article
                key={user.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${panelClass} p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-extrabold text-[#044598]">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">
                        {user.name || 'Utilisateur'}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                      user.role === 'admin'
                        ? 'bg-blue-50 text-[#044598]'
                        : user.role === 'owner'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {user.role}
                  </span>
                </div>

                <div className="my-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                    Boutique
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">
                    {user.shopName || 'Administration'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Inscrit le{' '}
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-400">
                    ID boutique : {user.shop_id || '—'}
                  </span>
                  <button
                    onClick={() =>
                      setConfirmDelete({ type: 'user', id: user.id })
                    }
                    disabled={protectedAccount}
                    title={
                      protectedAccount
                        ? 'Ce compte est protégé'
                        : 'Supprimer cet utilisateur'
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className={panelClass}>
          <EmptyState
            icon={Users}
            title="Aucun utilisateur trouvé"
            description="Essaie un autre nom ou email dans la recherche."
          />
        </div>
      )}
    </div>
  );

  const renderRequests = () => (
    <div>
      <SectionHeading
        eyebrow="Paiements"
        title="Demandes d’abonnement"
        description={`${pendingCount} demande(s) à vérifier.`}
      />

      {subscriptionRequests.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {subscriptionRequests.map((request) => {
            const pending = request.status === 'pending';
            const approved = request.status === 'approved';

            return (
              <motion.article
                key={request.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  `${panelClass} p-4`,
                  pending && 'border-amber-200',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'rounded-xl p-3',
                        pending
                          ? 'bg-amber-50 text-amber-700'
                          : approved
                            ? 'bg-blue-50 text-[#044598]'
                            : 'bg-red-50 text-red-600',
                      )}
                    >
                      <Store size={19} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900">
                        {request.shopName || 'Boutique'}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {request.userName || 'Utilisateur'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                      pending
                        ? 'bg-amber-50 text-amber-700'
                        : approved
                          ? 'bg-blue-50 text-[#044598]'
                          : 'bg-red-50 text-red-700',
                    )}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="my-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">
                      Moyen de paiement
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-bold capitalize text-slate-800">
                      {request.payment_method === 'wave' ? (
                        <Zap size={14} className="text-blue-600" />
                      ) : (
                        <CreditCard size={14} className="text-[#044598]" />
                      )}
                      {request.payment_method || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">
                      Date de demande
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {request.created_at
                        ? new Date(request.created_at).toLocaleString('fr-FR')
                        : '—'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">
                      Référence de transaction
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-700">
                      {request.transaction_ref || 'Non renseignée'}
                    </p>
                  </div>
                </div>

                {pending && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#044598] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[#033875] disabled:opacity-50"
                    >
                      {processingId === request.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={() => void handleReject(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {processingId === request.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      Refuser
                    </button>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className={panelClass}>
          <EmptyState
            icon={CreditCard}
            title="Aucune demande d’abonnement"
            description="Les nouvelles demandes apparaîtront ici."
          />
        </div>
      )}
    </div>
  );

  const renderBroadcast = () => (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <section className={`${panelClass} p-4 sm:p-5`}>
        <SectionHeading
          eyebrow="Communication"
          title="Envoyer un message"
          description="Choisis les destinataires puis rédige ton annonce."
        />

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            Destinataires
            <select
              className={`${inputClass} mt-1.5`}
              value={broadcastTarget}
              onChange={(event) => setBroadcastTarget(event.target.value)}
            >
              <option value="all">Tous les utilisateurs</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Titre
            <input
              className={`${inputClass} mt-1.5`}
              placeholder="Ex. Une mise à jour est disponible"
              value={broadcastTitle}
              onChange={(event) => setBroadcastTitle(event.target.value)}
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Message
            <textarea
              rows={5}
              className={`${inputClass} mt-1.5 resize-y`}
              placeholder="Écris ton message ici…"
              value={broadcastMessage}
              onChange={(event) => setBroadcastMessage(event.target.value)}
            />
          </label>

          <button
            onClick={() => void handleSendBroadcast()}
            disabled={
              sendingBroadcast ||
              !broadcastTitle.trim() ||
              !broadcastMessage.trim()
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#044598] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#033875] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingBroadcast ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}
            Envoyer le message
          </button>
        </div>
      </section>

      <section className={`${panelClass} p-4 sm:p-5`}>
        <SectionHeading
          eyebrow="Messages envoyés"
          title="Historique"
          description="Retrouve les annonces déjà diffusées."
        />

        <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
          {broadcastHistory.length ? (
            broadcastHistory.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase text-[#044598]">
                    {item.type || 'Annonce'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('fr-FR')
                      : ''}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-800">
                  {item.title}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                  {item.message}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <Globe size={12} />
                  {item.shopName || 'Tous les utilisateurs'}
                </p>
              </article>
            ))
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Aucun message envoyé"
              description="L’historique s’affichera après ta première diffusion."
            />
          )}
        </div>
      </section>
    </div>
  );

  const renderLogs = () => (
    <div>
      <SectionHeading
        eyebrow="Suivi"
        title="Journal d’audit"
        description={`${logs.length} événement(s) enregistré(s).`}
        action={
          <button
            onClick={() => exportToCSV(logs, 'audit_logs')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={15} />
            Exporter CSV
          </button>
        }
      />

      {logs.length ? (
        <div className="space-y-2">
          {logs.map((log) => {
            const isDelete = log.action?.includes('DELETE');
            const isApproval = log.action?.includes('APPROVE');

            return (
              <motion.article
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${panelClass} p-3 sm:p-4`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        'rounded-lg p-2',
                        isDelete
                          ? 'bg-red-50 text-red-600'
                          : isApproval
                            ? 'bg-blue-50 text-[#044598]'
                            : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      <Terminal size={16} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase',
                          isDelete
                            ? 'bg-red-50 text-red-700'
                            : isApproval
                              ? 'bg-blue-50 text-[#044598]'
                              : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {log.action}
                      </span>
                      <p className="mt-2 break-words text-sm text-slate-700">
                        {log.details || 'Aucun détail'}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {log.userName || 'Administrateur'} · {log.userEmail || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-600">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString('fr-FR')
                        : '—'}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      {log.ip_address || ''}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className={panelClass}>
          <EmptyState
            icon={Terminal}
            title="Aucun journal disponible"
            description="Les événements d’administration apparaîtront ici."
          />
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-3xl">
      <SectionHeading
        eyebrow="Configuration"
        title="Paramètres de la plateforme"
        description="Coordonnées de paiement, support et maintenance."
      />

      <div className="space-y-4">
        <section className={`${panelClass} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5 text-[#044598]">
              <CreditCard size={19} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Coordonnées</h3>
              <p className="text-xs text-slate-500">
                Informations montrées pour le paiement et le support.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Numéro Wave / Orange Money
              <input
                className={`${inputClass} mt-1.5`}
                value={platformSettings.payment_number || ''}
                onChange={(event) =>
                  setPlatformSettings({
                    ...platformSettings,
                    payment_number: event.target.value,
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Email du support
              <input
                type="email"
                className={`${inputClass} mt-1.5`}
                value={platformSettings.support_email || ''}
                onChange={(event) =>
                  setPlatformSettings({
                    ...platformSettings,
                    support_email: event.target.value,
                  })
                }
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Email d’alerte administrateur
              <input
                type="email"
                className={`${inputClass} mt-1.5`}
                value={platformSettings.admin_alert_email || ''}
                onChange={(event) =>
                  setPlatformSettings({
                    ...platformSettings,
                    admin_alert_email: event.target.value,
                  })
                }
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">
                Adresse qui reçoit les alertes système importantes.
              </span>
            </label>
          </div>
        </section>

        <section className={`${panelClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                <Settings size={19} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Mode maintenance</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Empêcher l’accès aux boutiques pendant une intervention.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={platformSettings.maintenance_mode === 'true'}
              onClick={() =>
                setPlatformSettings({
                  ...platformSettings,
                  maintenance_mode:
                    platformSettings.maintenance_mode === 'true'
                      ? 'false'
                      : 'true',
                })
              }
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                platformSettings.maintenance_mode === 'true'
                  ? 'bg-red-500'
                  : 'bg-slate-300',
              )}
            >
              <motion.span
                animate={{
                  x: platformSettings.maintenance_mode === 'true' ? 21 : 3,
                }}
                className="absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow"
              />
            </button>
          </div>

          {platformSettings.maintenance_mode === 'true' && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              Le mode maintenance est activé. Pense à enregistrer les modifications.
            </p>
          )}
        </section>

        <button
          onClick={() => void handleSaveSettings()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#044598] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#033875] sm:w-auto"
        >
          <CheckCircle2 size={17} />
          Enregistrer les paramètres
        </button>
      </div>
    </div>
  );

  const activeContent = {
    overview: renderOverview,
    shops: renderShops,
    users: renderUsers,
    requests: renderRequests,
    broadcast: renderBroadcast,
    logs: renderLogs,
    settings: renderSettings,
  }[activeTab]();

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#044598]">
              <ShieldCheck size={14} />
              MaCaisse · Console admin
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Administration
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gérez la plateforme et suivez son activité.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:self-auto">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Console active
          </div>
        </div>

        <nav
          aria-label="Sections d’administration"
          className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
        >
          <div className="flex min-w-max gap-1">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;

              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveTab(id);
                  }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors sm:px-4 sm:text-sm',
                    active
                      ? 'text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="macaisse-admin-active-tab"
                      className="absolute inset-0 rounded-xl bg-[#044598]"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                  <Icon size={16} className="relative z-10 shrink-0" />
                  <span className="relative z-10">{label}</span>
                  {id === 'requests' && pendingCount > 0 && (
                    <span
                      className={cn(
                        'relative z-10 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      {pendingCount}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.18 }}
        >
          {activeContent}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showAddAdminModal && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Fermer la fenêtre"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setShowAddAdminModal(false)}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-admin-title"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#044598]">
                    Comptes sécurisés
                  </p>
                  <h2
                    id="add-admin-title"
                    className="mt-1 text-xl font-extrabold text-slate-900"
                  >
                    Nouvel administrateur
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  aria-label="Fermer"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Nom complet
                  <span className="relative mt-1.5 block">
                    <Users
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      className={`${inputClass} pl-10`}
                      placeholder="Prénom Nom"
                      value={newAdminData.name}
                      onChange={(event) =>
                        setNewAdminData({
                          ...newAdminData,
                          name: event.target.value,
                        })
                      }
                    />
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <span className="relative mt-1.5 block">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className={`${inputClass} pl-10`}
                      placeholder="admin@domaine.com"
                      value={newAdminData.email}
                      onChange={(event) =>
                        setNewAdminData({
                          ...newAdminData,
                          email: event.target.value,
                        })
                      }
                    />
                  </span>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Mot de passe
                  <span className="relative mt-1.5 block">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      className={`${inputClass} pl-10`}
                      placeholder="Choisir un mot de passe"
                      value={newAdminData.password}
                      onChange={(event) =>
                        setNewAdminData({
                          ...newAdminData,
                          password: event.target.value,
                        })
                      }
                    />
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingAdmin}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#044598] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#033875] disabled:opacity-50"
                  >
                    {isCreatingAdmin ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Shield size={17} />
                    )}
                    Créer le compte
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete?.type === 'shop') {
            void handleDeleteShop(confirmDelete.id);
          } else if (confirmDelete?.type === 'user') {
            void handleDeleteUser(confirmDelete.id);
          }
        }}
        loading={isDeleting}
        title={
          confirmDelete?.type === 'shop'
            ? 'Supprimer la boutique'
            : "Supprimer l’utilisateur"
        }
        message={
          confirmDelete?.type === 'shop'
            ? 'Cette action supprimera définitivement la boutique et ses données (produits, ventes et utilisateurs). Elle est irréversible.'
            : 'Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.'
        }
      />
    </div>
  );
}
