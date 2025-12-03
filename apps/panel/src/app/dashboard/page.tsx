'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { DashboardHeader } from '@/components/DashboardHeader';
import { 
  Server, 
  Users, 
  Activity, 
  Cpu, 
  HardDrive,
  Clock,
  TrendingUp,
  Crown
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
      // Auto-refresh stats every 10 seconds
      const interval = setInterval(fetchStats, 10000);
      return () => clearInterval(interval);
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
      <DashboardHeader activeTab="dashboard" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live • Updates every 10s
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Servers"
            value={stats?.guildCount ?? 0}
            icon={<Server className="h-5 w-5" />}
            loading={statsLoading}
            color="text-blue-500"
          />
          <StatCard
            title="Total Members"
            value={stats?.userCount ?? 0}
            icon={<Users className="h-5 w-5" />}
            loading={statsLoading}
            color="text-green-500"
          />
          <StatCard
            title="Channels"
            value={stats?.channelCount ?? 0}
            icon={<Activity className="h-5 w-5" />}
            loading={statsLoading}
            color="text-purple-500"
          />
          <StatCard
            title="Uptime"
            value={formatUptime(stats?.uptime ?? 0)}
            icon={<Clock className="h-5 w-5" />}
            loading={statsLoading}
            isText
            color="text-amber-500"
          />
        </div>

        {/* System Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Cpu className="h-5 w-5 text-blue-500" />
              CPU Usage
            </h3>
            <div className="mb-3 h-4 overflow-hidden rounded-full bg-secondary">
              <div 
                className={`h-full transition-all duration-500 ${
                  (stats?.cpuUsage ?? 0) > 80 ? 'bg-red-500' :
                  (stats?.cpuUsage ?? 0) > 50 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(stats?.cpuUsage ?? 0, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">
                {(stats?.cpuUsage ?? 0).toFixed(1)}%
              </p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                (stats?.cpuUsage ?? 0) > 80 ? 'bg-red-500/20 text-red-500' :
                (stats?.cpuUsage ?? 0) > 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'
              }`}>
                {(stats?.cpuUsage ?? 0) > 80 ? 'High' : (stats?.cpuUsage ?? 0) > 50 ? 'Medium' : 'Normal'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <HardDrive className="h-5 w-5 text-purple-500" />
              Memory Usage
            </h3>
            <div className="mb-3 h-4 overflow-hidden rounded-full bg-secondary">
              <div 
                className={`h-full transition-all duration-500 ${
                  (stats?.memoryUsage ?? 0) > 800 ? 'bg-red-500' :
                  (stats?.memoryUsage ?? 0) > 400 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((stats?.memoryUsage ?? 0) / 10, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">
                {(stats?.memoryUsage ?? 0) >= 1024 
                  ? `${((stats?.memoryUsage ?? 0) / 1024).toFixed(2)} GB`
                  : `${(stats?.memoryUsage ?? 0).toFixed(1)} MB`
                }
              </p>
              <span className={`text-xs px-2 py-1 rounded-full ${
                (stats?.memoryUsage ?? 0) > 800 ? 'bg-red-500/20 text-red-500' :
                (stats?.memoryUsage ?? 0) > 400 ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'
              }`}>
                {(stats?.memoryUsage ?? 0) > 800 ? 'High' : (stats?.memoryUsage ?? 0) > 400 ? 'Medium' : 'Normal'}
              </span>
            </div>
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
            {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
              <button 
                onClick={() => router.push('/dashboard/admin')}
                className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent border-amber-500/30"
              >
                <Crown className="h-5 w-5 text-amber-500" />
                <span>Bot Owner Panel</span>
              </button>
            )}
            <button 
              onClick={fetchStats}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Refresh Stats</span>
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
  isText = false,
  color = 'text-primary'
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode;
  loading: boolean;
  isText?: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className={color}>{icon}</div>
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
