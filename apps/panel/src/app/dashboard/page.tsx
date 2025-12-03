'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { DashboardHeader } from '@/components/DashboardHeader';
import { 
  Server, 
  Users, 
  Activity, 
  Clock,
  TrendingUp,
  Crown,
  Settings,
  Shield,
  Zap,
  MessageSquare,
  ExternalLink,
  Bot
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

        {/* Bot Properties & Features */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Bot className="h-5 w-5 text-primary" />
              Bot Properties
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">v5.0.0</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Commands</span>
                <span className="font-medium">25+</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">{formatUptime(stats?.uptime ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Zap className="h-5 w-5 text-amber-500" />
              Features
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Moderation</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <span className="text-sm">Auto Responder</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Welcome System</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <Activity className="h-4 w-4 text-red-500" />
                <span className="text-sm">Logging</span>
              </div>
            </div>
            <a 
              href="https://discord.gg/sufbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Join Support Server
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <button 
              onClick={() => router.push('/dashboard/servers')}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Server className="h-5 w-5 text-primary" />
              <div className="text-left">
                <span className="font-medium">Manage Servers</span>
                <p className="text-xs text-muted-foreground">Configure your servers</p>
              </div>
            </button>
            <button 
              onClick={fetchStats}
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div className="text-left">
                <span className="font-medium">Refresh Stats</span>
                <p className="text-xs text-muted-foreground">Update dashboard data</p>
              </div>
            </button>
            <a 
              href="https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8&scope=bot%20applications.commands"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <Bot className="h-5 w-5 text-blue-500" />
              <div className="text-left">
                <span className="font-medium">Invite Bot</span>
                <p className="text-xs text-muted-foreground">Add to another server</p>
              </div>
            </a>
            {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
              <button 
                onClick={() => router.push('/dashboard/admin')}
                className="flex items-center gap-3 rounded-lg border border-amber-500/30 p-4 transition-colors hover:bg-amber-500/10"
              >
                <Crown className="h-5 w-5 text-amber-500" />
                <div className="text-left">
                  <span className="font-medium">Owner Panel</span>
                  <p className="text-xs text-muted-foreground">Bot administration</p>
                </div>
              </button>
            )}
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
