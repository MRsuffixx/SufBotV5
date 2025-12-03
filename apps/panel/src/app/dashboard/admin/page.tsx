'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { 
  Bot,
  Server,
  Users,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Settings,
  Play,
  Eye,
  Radio,
  Gamepad2,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ArrowLeft,
  Crown,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Timer,
  Link as LinkIcon,
  LogOut
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface BotStats {
  guildCount: number;
  userCount: number;
  channelCount: number;
  commandsUsed: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}

interface StatusActivity {
  id: string;
  type: 'PLAYING' | 'WATCHING' | 'LISTENING' | 'STREAMING' | 'COMPETING';
  name: string;
  url?: string;
}

interface BotConfig {
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  activities: StatusActivity[];
  rotateStatus: boolean;
  rotateInterval: number; // in seconds
}

interface GuildOverview {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  ownerId: string;
  ownerName: string;
  joinedAt: string;
  premium: boolean;
}

const ACTIVITY_TYPES = [
  { value: 'PLAYING', label: 'Playing', icon: Gamepad2 },
  { value: 'WATCHING', label: 'Watching', icon: Eye },
  { value: 'LISTENING', label: 'Listening to', icon: Radio },
  { value: 'STREAMING', label: 'Streaming', icon: Play },
  { value: 'COMPETING', label: 'Competing in', icon: Crown },
];

const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: 'bg-green-500' },
  { value: 'idle', label: 'Idle', color: 'bg-yellow-500' },
  { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
  { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' },
];

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, accessToken } = useAuthStore();
  const [stats, setStats] = useState<BotStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [guilds, setGuilds] = useState<GuildOverview[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Bot config state
  const [botConfig, setBotConfig] = useState<BotConfig>({
    status: 'online',
    activities: [
      { id: '1', type: 'WATCHING', name: '/help | sufbot.com' }
    ],
    rotateStatus: false,
    rotateInterval: 30,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (accessToken && (user?.role === 'OWNER' || user?.role === 'ADMIN')) {
      fetchStats();
      fetchGuilds();
      fetchBotConfig();
    }
  }, [accessToken, user]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bot/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchGuilds = async () => {
    try {
      const response = await fetch(`${API_URL}/api/guilds/admin/all`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGuilds(data);
      }
    } catch (error) {
      console.error('Failed to fetch guilds:', error);
    } finally {
      setGuildsLoading(false);
    }
  };

  const leaveGuild = async (guildId: string, guildName: string) => {
    if (!confirm(`Are you sure you want to make the bot leave "${guildName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/guilds/admin/${guildId}/leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        // Remove guild from list
        setGuilds(prev => prev.filter(g => g.id !== guildId));
        alert(`Bot has left "${guildName}" successfully.`);
      } else {
        const error = await response.text();
        alert(`Failed to leave guild: ${error}`);
      }
    } catch (error) {
      console.error('Failed to leave guild:', error);
      alert('Failed to leave guild. Check console for details.');
    }
  };

  const fetchBotConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/bot-config`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setBotConfig(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bot config:', error);
    }
  };

  const saveBotConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/bot-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(botConfig),
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save bot config:', error);
    } finally {
      setSaving(false);
    }
  };

  const addActivity = () => {
    const newActivity: StatusActivity = {
      id: Date.now().toString(),
      type: 'PLAYING',
      name: '',
    };
    setBotConfig(prev => ({
      ...prev,
      activities: [...prev.activities, newActivity],
    }));
  };

  const removeActivity = (id: string) => {
    setBotConfig(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id),
    }));
  };

  const updateActivity = (id: string, field: keyof StatusActivity, value: string) => {
    setBotConfig(prev => ({
      ...prev,
      activities: prev.activities.map(a => 
        a.id === id ? { ...a, [field]: value } : a
      ),
    }));
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatMemory = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <div className="p-4 rounded-lg bg-card border text-left text-sm">
            <p className="font-medium mb-2">Debug Info:</p>
            <p className="text-muted-foreground">Your Discord ID: <code className="bg-secondary px-1 rounded">{user?.discordId || 'N/A'}</code></p>
            <p className="text-muted-foreground">Current Role: <code className="bg-secondary px-1 rounded">{user?.role || 'N/A'}</code></p>
            <p className="text-muted-foreground mt-2 text-xs">
              To access this page, add your Discord ID to <code className="bg-secondary px-1 rounded">BOT_OWNER_IDS</code> in the .env file and re-login.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-amber-500" />
              <span className="text-xl font-bold">Bot Owner Panel</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              {user?.role}
            </span>
            {user?.avatar ? (
              <img 
                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                alt={user.username}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 shrink-0">
            <nav className="space-y-1">
              {[
                { id: 'overview', name: 'Overview', icon: Activity },
                { id: 'status', name: 'Bot Status', icon: Bot },
                { id: 'servers', name: 'All Servers', icon: Server },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                
                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Servers"
                    value={stats?.guildCount ?? 0}
                    icon={<Server className="h-5 w-5" />}
                    loading={statsLoading}
                  />
                  <StatCard
                    title="Total Users"
                    value={stats?.userCount ?? 0}
                    icon={<Users className="h-5 w-5" />}
                    loading={statsLoading}
                  />
                  <StatCard
                    title="Commands Used"
                    value={stats?.commandsUsed ?? 0}
                    icon={<Activity className="h-5 w-5" />}
                    loading={statsLoading}
                  />
                  <StatCard
                    title="Uptime"
                    value={formatUptime(stats?.uptime ?? 0)}
                    icon={<Clock className="h-5 w-5" />}
                    loading={statsLoading}
                    isText
                  />
                </div>

                {/* System Resources */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <Cpu className="h-5 w-5 text-primary" />
                      CPU Usage
                    </h3>
                    <div className="mb-2 h-4 overflow-hidden rounded-full bg-secondary">
                      <div 
                        className={`h-full transition-all ${
                          (stats?.cpuUsage ?? 0) > 80 ? 'bg-red-500' :
                          (stats?.cpuUsage ?? 0) > 50 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${stats?.cpuUsage ?? 0}%` }}
                      />
                    </div>
                    <p className="text-2xl font-bold">
                      {(stats?.cpuUsage ?? 0).toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <HardDrive className="h-5 w-5 text-primary" />
                      Memory Usage
                    </h3>
                    <div className="mb-2 h-4 overflow-hidden rounded-full bg-secondary">
                      <div 
                        className={`h-full transition-all ${
                          (stats?.memoryUsage ?? 0) > 800 ? 'bg-red-500' :
                          (stats?.memoryUsage ?? 0) > 400 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((stats?.memoryUsage ?? 0) / 10, 100)}%` }}
                      />
                    </div>
                    <p className="text-2xl font-bold">
                      {formatMemory(stats?.memoryUsage ?? 0)}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <button 
                      onClick={() => setActiveTab('status')}
                      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <Bot className="h-5 w-5 text-primary" />
                      <span>Configure Status</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('servers')}
                      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <Server className="h-5 w-5 text-primary" />
                      <span>View All Servers</span>
                    </button>
                    <button 
                      onClick={fetchStats}
                      className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                    >
                      <RefreshCw className="h-5 w-5 text-primary" />
                      <span>Refresh Stats</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bot Status Tab */}
            {activeTab === 'status' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Bot Status Configuration</h2>
                  <button
                    onClick={saveBotConfig}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saved ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>

                {/* Online Status */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Online Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => setBotConfig(prev => ({ ...prev, status: status.value as any }))}
                        className={`p-4 rounded-lg border transition-colors ${
                          botConfig.status === status.value
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${status.color}`} />
                          <span className="font-medium">{status.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activity Status */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Activity Status</h3>
                    <button
                      onClick={addActivity}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Activity
                    </button>
                  </div>

                  <div className="space-y-4">
                    {botConfig.activities.map((activity, index) => (
                      <div key={activity.id} className="p-4 rounded-lg border bg-background">
                        <div className="flex items-start gap-4">
                          <span className="text-sm text-muted-foreground mt-2">#{index + 1}</span>
                          
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium mb-1">Type</label>
                                <select
                                  value={activity.type}
                                  onChange={(e) => updateActivity(activity.id, 'type', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  {ACTIVITY_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">Text</label>
                                <input
                                  type="text"
                                  value={activity.name}
                                  onChange={(e) => updateActivity(activity.id, 'name', e.target.value)}
                                  placeholder="Enter activity text..."
                                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            </div>

                            {activity.type === 'STREAMING' && (
                              <div>
                                <label className="block text-sm font-medium mb-1">
                                  <LinkIcon className="h-4 w-4 inline mr-1" />
                                  Stream URL (Twitch/YouTube)
                                </label>
                                <input
                                  type="url"
                                  value={activity.url || ''}
                                  onChange={(e) => updateActivity(activity.id, 'url', e.target.value)}
                                  placeholder="https://twitch.tv/username"
                                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => removeActivity(activity.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            disabled={botConfig.activities.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Rotation */}
                <div className="rounded-xl border bg-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Status Rotation</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically rotate between activities at set intervals
                      </p>
                    </div>
                    <button
                      onClick={() => setBotConfig(prev => ({ ...prev, rotateStatus: !prev.rotateStatus }))}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        botConfig.rotateStatus ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${
                        botConfig.rotateStatus ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {botConfig.rotateStatus && (
                    <div className="mt-4 pt-4 border-t">
                      <label className="block text-sm font-medium mb-2">
                        <Timer className="h-4 w-4 inline mr-1" />
                        Rotation Interval
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="10"
                          value={botConfig.rotateInterval}
                          onChange={(e) => setBotConfig(prev => ({ ...prev, rotateInterval: parseInt(e.target.value) }))}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-20 text-right">
                          {botConfig.rotateInterval}s
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status will change every {botConfig.rotateInterval} seconds
                      </p>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="rounded-xl border bg-card p-6">
                  <h3 className="text-lg font-semibold mb-4">Preview</h3>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-[#2b2d31]">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#2b2d31] ${
                        STATUS_OPTIONS.find(s => s.value === botConfig.status)?.color
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-white">SufBot</p>
                      <p className="text-sm text-gray-400">
                        {ACTIVITY_TYPES.find(t => t.value === botConfig.activities[0]?.type)?.label}{' '}
                        <span className="text-white">{botConfig.activities[0]?.name || 'No activity'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Servers Tab */}
            {activeTab === 'servers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">All Servers ({guilds.length})</h2>
                  <button
                    onClick={fetchGuilds}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                {guildsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Server</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Members</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Owner</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {guilds.map((guild) => (
                          <tr key={guild.id} className="hover:bg-accent/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {guild.icon ? (
                                  <img
                                    src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                    alt={guild.name}
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                      {guild.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{guild.name}</p>
                                  <p className="text-xs text-muted-foreground">{guild.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                {guild.memberCount?.toLocaleString() || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {guild.ownerName || guild.ownerId}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {guild.joinedAt ? new Date(guild.joinedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              {guild.premium ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-500">
                                  <Crown className="h-3 w-3" />
                                  Premium
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground">
                                  Free
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => router.push(`/dashboard/servers/${guild.id}`)}
                                  className="px-3 py-1 rounded-lg text-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  Manage
                                </button>
                                <button
                                  onClick={() => leaveGuild(guild.id, guild.name)}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-sm bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                  title="Make bot leave this server"
                                >
                                  <LogOut className="h-3 w-3" />
                                  Leave
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  loading,
  isText = false 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode;
  loading: boolean;
  isText?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="text-primary">{icon}</div>
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-secondary" />
      ) : (
        <p className="text-2xl font-bold">
          {isText ? value : (typeof value === 'number' ? value.toLocaleString() : value)}
        </p>
      )}
    </div>
  );
}
