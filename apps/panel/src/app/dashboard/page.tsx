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
  TrendingUp
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

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, accessToken } = useAuthStore();
  const [stats, setStats] = useState<BotStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
  }, [accessToken]);

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

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SufBot Dashboard</span>
          </div>
          <nav className="flex items-center gap-6">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-foreground font-medium"
            >
              Dashboard
            </button>
            <button 
              onClick={() => router.push('/dashboard/servers')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Servers
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.username}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold">Dashboard</h1>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Servers"
            value={stats?.guildCount ?? 0}
            icon={<Server className="h-5 w-5" />}
            loading={statsLoading}
          />
          <StatCard
            title="Users"
            value={stats?.userCount ?? 0}
            icon={<Users className="h-5 w-5" />}
            loading={statsLoading}
          />
          <StatCard
            title="Commands Used"
            value={stats?.commandsUsed ?? 0}
            icon={<TrendingUp className="h-5 w-5" />}
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

        {/* System Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Cpu className="h-5 w-5 text-primary" />
              CPU Usage
            </h3>
            <div className="mb-2 h-4 overflow-hidden rounded-full bg-secondary">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${stats?.cpuUsage ?? 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
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
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min((stats?.memoryUsage ?? 0) / 10, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {(stats?.memoryUsage ?? 0).toFixed(1)} MB
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <button 
              onClick={() => router.push('/dashboard/servers')}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Server className="h-5 w-5 text-primary" />
              <span>Manage Servers</span>
            </button>
            <button className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent">
              <Activity className="h-5 w-5 text-primary" />
              <span>View Logs</span>
            </button>
            <button className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent">
              <Bot className="h-5 w-5 text-primary" />
              <span>Bot Settings</span>
            </button>
          </div>
        </div>
      </main>
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
